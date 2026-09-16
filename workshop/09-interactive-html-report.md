# Optional: Generate an interactive HTML report

> **Pace:** Self-paced
> **Prerequisite:** Complete the seven core steps first. This extension also works after optional
> model selection.

## What you'll build

The Markdown report is useful in a terminal, but its findings are easier to explore in a browser.
You will let the same report session create one standalone `accessibility-report.html` file, then
open it locally and filter its findings.

## Add a narrow write capability

The previous application-owned tools are read-only, and Playwright can navigate only to one exact
URL. This extension adds one runtime built-in tool: `builtin:apply_patch`.

That does **not** mean approving every file change. Keep the existing browser-navigation rule and
approve a write only when it targets `accessibility-report.html` directly in the application working
directory. Reject shell commands, other file writes, and every other permission request.

The report prompt remains evidence-based: it must navigate, read the current-run snapshot, and look
up catalog guidance before it writes the HTML artifact.

Preserve exact target navigation while adding the single output path. The application's artifact
check is separate from permission approval: it must observe new or changed file content before it
announces an update.

:::language dotnet
## Scope the .NET write permission

Replace `CreateForTarget` in `Helpers/WorkshopPermissionHandler.cs`. The helper now
also receives the application directory and permits only the one normalized report path:

<!-- code-id: 09-interactive-html-report-dotnet-1 -->
```csharp
public static Func<PermissionRequest, PermissionInvocation, Task<PermissionDecision>> CreateForTarget(
    Uri allowedTarget,
    string workingDirectory)
{
    ArgumentNullException.ThrowIfNull(allowedTarget);
    ArgumentException.ThrowIfNullOrWhiteSpace(workingDirectory);
    var applicationDirectory = Path.GetFullPath(workingDirectory);
    var reportPath = Path.Combine(applicationDirectory, "accessibility-report.html");

    bool IsReportPath(string? fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return false;
        }
        try
        {
            var requestedPath = Path.GetFullPath(fileName, applicationDirectory);
            return requestedPath.Equals(reportPath, OperatingSystem.IsWindows()
                       ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal) &&
                   new FileInfo(reportPath).LinkTarget is null &&
                   !Directory.Exists(reportPath);
        }
        catch (ArgumentException)
        {
            return false;
        }
    }

    return (request, _) =>
    {
        var decision = request switch
        {
            PermissionRequestMcp { ServerName: "playwright", ManagedApprovalRequired: not true } navigation
                when IsPlaywrightTool(navigation, "browser_navigate") &&
                     IsNavigationToTarget(navigation.Args, allowedTarget) =>
                PermissionDecision.ApproveOnce(),
            PermissionRequestWrite { ManagedApprovalRequired: not true, RequestSandboxBypass: not true } write
                when IsReportPath(write.FileName) =>
                PermissionDecision.ApproveOnce(),
            _ => PermissionDecision.Reject(
                "This workshop allows only exact target navigation and writing accessibility-report.html.")
        };

        return Task.FromResult(decision);
    };
}
```

Keep the existing helper methods. In `Program.cs`, remove only the old one-argument
`OnPermissionRequest = WorkshopPermissionHandler.CreateForTarget(targetUri),` entry from the
`config` initializer. Keep every other entry, including any selected model.

Replace the section from `await using var session = await client.CreateSessionAsync(config);`
through the old final send/output block with the following top-level statements. Do not paste
these statements inside the initializer. `ArtifactVerifier` is supplied in the helper namespace
already imported:

<!-- code-id: 09-interactive-html-report-dotnet-2 -->
```csharp
config.WorkingDirectory = workingDirectory;
config.OnPermissionRequest = WorkshopPermissionHandler.CreateForTarget(targetUri, workingDirectory);
config.AvailableTools =
[
    "accessibility_rule_lookup",
    "read_latest_accessibility_snapshot",
    "playwright-browser_navigate",
    "builtin:apply_patch"
];

var artifact = ArtifactVerifier.CaptureArtifactState(workingDirectory, "accessibility-report.html");
await using var session = await client.CreateSessionAsync(config);

Console.WriteLine($"\nAnalyzing: {targetUri.AbsoluteUri}\n");
Console.WriteLine("Model response (not file verification):");
await ResponseStreamer.SendAndPrintAsync(session, Prompts.CreateReportPrompt(targetUri));

ArtifactVerifier.VerifyArtifactUpdate(artifact);
Console.WriteLine("Verified a new or changed accessibility-report.html. Review its source and accessibility before use.");
```

Replace the entire expression-bodied `CreateReportPrompt` member in `Helpers/Prompts.cs`,
including its signature:

<!-- code-id: 09-interactive-html-report-dotnet-3 -->
```csharp
public static string CreateReportPrompt(Uri targetUri) => $"""
    Prepare an evidence-based accessibility review of {targetUri.AbsoluteUri}.

    1. Use browser_navigate to open that exact URL.
    2. Call read_latest_accessibility_snapshot to inspect its accessibility tree.
    3. Identify three to five high-confidence issues supported by the snapshot.
    4. Call accessibility_rule_lookup for each issue before recommending a fix.
    5. Use apply_patch to create exactly accessibility-report.html in the current working directory.

    Write one complete, standalone HTML document. Use semantic HTML, embedded CSS, and embedded
    JavaScript only; do not use external assets, URLs, or libraries. Include a title, target URL,
    finding count, review limits, and one finding card per supported issue with its evidence, WCAG
    criterion, and remediation. Add an accessible text filter that updates a visible result count
    and filters cards by finding name, criterion, or evidence. Escape all finding text before
    inserting it into HTML. Make keyboard focus visible.

    Do not write any other file. After the write succeeds, respond only with:
    Created accessibility-report.html
    """;
```
:::

:::language nodejs
## Scope the Node.js write permission

In `src/workshop.ts`, replace `permissionForTarget` with a version that preserves
exact navigation and adds only the normalized report path:

<!-- code-id: 09-interactive-html-report-nodejs-1 -->
```typescript
export function permissionForTarget(target: URL, workingDirectory: string): PermissionHandler {
  const reportPath = resolve(workingDirectory, "accessibility-report.html");
  return (request) => {
    if (request.kind === "mcp" && request.serverName === "playwright" &&
      (request.toolName === "browser_navigate" || request.toolName === "playwright-browser_navigate") &&
      request.args !== null && typeof request.args === "object" && !Array.isArray(request.args) &&
      typeof request.args.url === "string" && URL.canParse(request.args.url) && sameUrl(new URL(request.args.url), target)) {
      return { kind: "approve-once" };
    }
    if (request.kind === "write" && typeof request.fileName === "string" &&
      resolve(workingDirectory, request.fileName) === reportPath) {
      return { kind: "approve-once" };
    }
    return { kind: "reject", feedback: "This workshop allows only exact target navigation and writing accessibility-report.html." };
  };
}
```

In `src/report.ts`, pass the working directory to the handler and append the built-in
tool to `availableTools`:

<!-- code-id: 09-interactive-html-report-nodejs-2 -->
```typescript
onPermissionRequest: permissionForTarget(target, process.cwd()),
availableTools: [
  "accessibility_rule_lookup",
  "read_latest_accessibility_snapshot",
  "playwright-browser_navigate",
  "builtin:apply_patch",
],
```

Replace `reportPrompt` in `src/workshop.ts`:

<!-- code-id: 09-interactive-html-report-nodejs-3 -->
```typescript
export function reportPrompt(target: URL): string {
  return `Prepare an evidence-based accessibility review of ${target.href}.
1. Use browser_navigate to open that exact URL.
2. Call read_latest_accessibility_snapshot to inspect its accessibility tree.
3. Identify three to five high-confidence issues supported by the snapshot.
4. Call accessibility_rule_lookup for each issue before recommending a fix.
5. Use apply_patch to create exactly accessibility-report.html in the current working directory.

Write one complete, standalone HTML document. Use semantic HTML, embedded CSS, and embedded
JavaScript only; do not use external assets, URLs, or libraries. Include a title, target URL,
finding count, review limits, and one finding card per supported issue with its evidence, WCAG
criterion, and remediation. Add an accessible text filter that updates a visible result count
and filters cards by finding name, criterion, or evidence. Escape all finding text before
inserting it into HTML. Make keyboard focus visible.

Do not write any other file. After the write succeeds, respond only with:
Created accessibility-report.html`;
}
```

Import the supplied artifact checks in `src/report.ts`:

<!-- code-id: 09-html-nodejs-artifact-import -->
```typescript
import { captureArtifactState, verifyArtifactUpdate } from "./workshop.js";
```

Replace the inner `try` block that sends the report prompt with this block. Keep its existing
`finally` that disconnects the session and the outer client cleanup:

<!-- code-id: 09-html-nodejs-artifact-check -->
```typescript
try {
  const before = await captureArtifactState(process.cwd(), "accessibility-report.html");
  await streamResponse(session, reportPrompt(target));
  await verifyArtifactUpdate(before);
  console.log("Verified a new or updated accessibility-report.html. Review its source before opening it.");
}
```

The helper compares the exact file's contents before and after the turn and rejects missing,
empty, unchanged, directory, or symbolic-link output. A model saying "Created" is not sufficient.
:::

:::language python
## Scope the Python write permission

In `workshop.py`, replace `permission_for_target` with this path-aware version:

<!-- code-id: 09-interactive-html-report-python-1 -->
```python
def permission_for_target(target: str, working_directory: str):
    report_path = Path(working_directory, "accessibility-report.html").resolve()

    def handler(request, _invocation):
        if getattr(request, "kind", None) == "mcp" and request.server_name == "playwright" and request.tool_name in {"browser_navigate", "playwright-browser_navigate"} and isinstance(request.args, dict) and isinstance(request.args.get("url"), str) and _same_url(request.args["url"], target):
            return PermissionDecisionApproveOnce()
        if getattr(request, "kind", None) == "write" and isinstance(getattr(request, "file_name", None), str):
            candidate = Path(request.file_name)
            candidate = candidate if candidate.is_absolute() else Path(working_directory, candidate)
            if candidate.resolve() == report_path:
                return PermissionDecisionApproveOnce()
        return PermissionDecisionReject(
            feedback="This workshop allows only exact target navigation and writing accessibility-report.html.")

    return handler
```

In `report.py`, pass the current directory to the permission handler and append the
source-qualified built-in tool:

<!-- code-id: 09-interactive-html-report-python-2 -->
```python
on_permission_request=permission_for_target(target, "."),
available_tools=[
    "accessibility_rule_lookup",
    "read_latest_accessibility_snapshot",
    "playwright-browser_navigate",
    "builtin:apply_patch",
],
```

Replace `report_prompt` in `workshop.py`:

<!-- code-id: 09-interactive-html-report-python-3 -->
```python
def report_prompt(target: str) -> str:
    return f"""Prepare an evidence-based accessibility review of {target}.
1. Use browser_navigate to open that exact URL.
2. Call read_latest_accessibility_snapshot to inspect its accessibility tree.
3. Identify three to five high-confidence issues supported by the snapshot.
4. Call accessibility_rule_lookup for each issue before recommending a fix.
5. Use apply_patch to create exactly accessibility-report.html in the current working directory.

Write one complete, standalone HTML document. Use semantic HTML, embedded CSS, and embedded
JavaScript only; do not use external assets, URLs, or libraries. Include a title, target URL,
finding count, review limits, and one finding card per supported issue with its evidence, WCAG
criterion, and remediation. Add an accessible text filter that updates a visible result count
and filters cards by finding name, criterion, or evidence. Escape all finding text before
inserting it into HTML. Make keyboard focus visible.

Do not write any other file. After the write succeeds, respond only with:
Created accessibility-report.html"""
```

In `report.py`, add this import:

<!-- code-id: 09-html-python-artifact-import -->
```python
from workshop import capture_artifact_state, verify_artifact_update
```

Replace the event subscription/send/wait block, through its final error check, with:

<!-- code-id: 09-html-python-artifact-check -->
```python
            before = capture_artifact_state(".", "accessibility-report.html")
            unsubscribe = session.on(on_event)
            try:
                async with asyncio.timeout(120):
                    await session.send(report_prompt(target))
                    await done.wait()
                if error is not None:
                    raise error
                verify_artifact_update(before)
                print("Verified a new or updated accessibility-report.html. Review its source before opening it.")
            finally:
                unsubscribe()
```

The exact output file must be new or content-changed, nonempty, and regular. Missing, unchanged,
empty, directory, or symbolic-link output is not a verified update. Existing files are not deleted.
:::

:::language go
## Scope the Go write permission

Replace `permissionForTarget` in `main.go`. The write branch resolves relative file
names against the application working directory, so a sibling or parent path is rejected:

<!-- code-id: 09-interactive-html-report-go-1 -->
```go
func permissionForTarget(target, workingDirectory string) copilot.PermissionHandlerFunc {
	reportPath := filepath.Clean(filepath.Join(workingDirectory, "accessibility-report.html"))
	return func(request copilot.PermissionRequest, _ copilot.PermissionInvocation) (rpc.PermissionDecision, error) {
		raw, err := json.Marshal(request)
		if err != nil {
			return &rpc.PermissionDecisionReject{}, nil
		}
		var value map[string]any
		if json.Unmarshal(raw, &value) == nil && value["kind"] == "mcp" && value["serverName"] == "playwright" {
			toolName, _ := value["toolName"].(string)
			args, _ := value["args"].(map[string]any)
			requested, _ := args["url"].(string)
			if (toolName == "browser_navigate" || toolName == "playwright-browser_navigate") && sameURL(requested, target) {
				return &rpc.PermissionDecisionApproveOnce{}, nil
			}
		}
		if json.Unmarshal(raw, &value) == nil && value["kind"] == "write" {
			if fileName, ok := value["fileName"].(string); ok && fileName != "" {
				candidate := fileName
				if !filepath.IsAbs(candidate) {
					candidate = filepath.Join(workingDirectory, candidate)
				}
				if filepath.Clean(candidate) == reportPath {
					return &rpc.PermissionDecisionApproveOnce{}, nil
				}
			}
		}
		feedback := "This workshop allows only exact target navigation and writing accessibility-report.html."
		return &rpc.PermissionDecisionReject{Feedback: &feedback}, nil
	}
}
```

Pass `workingDirectory` to the helper and append the source-qualified built-in tool:

<!-- code-id: 09-interactive-html-report-go-2 -->
```go
WorkingDirectory:    workingDirectory,
AvailableTools:      []string{"accessibility_rule_lookup", "read_latest_accessibility_snapshot", "playwright-browser_navigate", "builtin:apply_patch"},
OnPermissionRequest: permissionForTarget(target, workingDirectory),
```

Replace `reportPrompt`:

<!-- code-id: 09-interactive-html-report-go-3 -->
```go
func reportPrompt(target string) string {
	return fmt.Sprintf(`Prepare an evidence-based accessibility review of %s.
1. Use browser_navigate to open that exact URL.
2. Call read_latest_accessibility_snapshot to inspect its accessibility tree.
3. Identify three to five high-confidence issues supported by the snapshot.
4. Call accessibility_rule_lookup for each issue before recommending a fix.
5. Use apply_patch to create exactly accessibility-report.html in the current working directory.

Write one complete, standalone HTML document. Use semantic HTML, embedded CSS, and embedded
JavaScript only; do not use external assets, URLs, or libraries. Include a title, target URL,
finding count, review limits, and one finding card per supported issue with its evidence, WCAG
criterion, and remediation. Add an accessible text filter that updates a visible result count
and filters cards by finding name, criterion, or evidence. Escape all finding text before
inserting it into HTML. Make keyboard focus visible.

Do not write any other file. After the write succeeds, respond only with:
Created accessibility-report.html`, target)
}
```

Inside run(), replace the final streamResponse(session, reportPrompt(target)) error-check block; keep the following return nil and existing cleanup defers. Works directly after Step 6 or after Step 8 model selection.

<!-- code-id: 09-html-go-artifact-check -->
```go
before, err := CaptureArtifactState(workingDirectory, "accessibility-report.html")
if err != nil {
	return err
}
fmt.Println("Model HTML response (not file verification):")
if err := streamResponse(session, reportPrompt(target)); err != nil {
	return err
}
if err := VerifyArtifactUpdate(before); err != nil {
	return err
}
fmt.Println("Verified a new or changed nonempty accessibility-report.html. Review its source and behavior before use.")
```

:::

:::language rust
## Scope the Rust write permission

Add `report_path: PathBuf` to `ScopedPermissions`. Keep the Step 4 `permission_payload` extraction:
it prefers the nested `permissionRequest` object when the SDK sends one, falls back to the direct
object for older payloads, and rejects malformed nested values. Replace the old final permission decision's entire `if`/`else` with the block below.
Keep the already extracted `server`, `tool`, `requested`, and `kind_allowed` values:

<!-- code-id: 09-interactive-html-report-rust-1 -->
```rust
let payload = permission_payload(&request.extra);
let write_kind = if request.extra.get("permissionRequest").is_some() {
    payload
        .and_then(|payload| payload.get("kind"))
        .and_then(serde_json::Value::as_str)
        == Some("write")
        && (request.kind.is_none()
            || request.kind == Some(github_copilot_sdk::types::PermissionRequestKind::Write))
} else {
    request.kind == Some(github_copilot_sdk::types::PermissionRequestKind::Write)
};
let file_name = permission_payload(&request.extra)
    .and_then(|payload| payload.get("fileName"))
    .and_then(serde_json::Value::as_str);
let report_write = write_kind
    && file_name
        .filter(|name| !name.is_empty())
        .is_some_and(|name| {
            let candidate = Path::new(name);
            let candidate = if candidate.is_absolute() {
                candidate.to_path_buf()
            } else {
                self.report_path
                    .parent()
                    .unwrap_or(Path::new(""))
                    .join(candidate)
            };
            candidate == self.report_path
        });

if report_write {
    PermissionResult::approve_once()
} else if kind_allowed
    && server == Some("playwright")
    && matches!(
        tool,
        Some("browser_navigate" | "playwright-browser_navigate")
    )
    && requested
        .as_ref()
        .is_some_and(|url| same_url(url, &self.target))
{
    PermissionResult::approve_once()
} else {
    PermissionResult::reject(Some(
    "This workshop allows only exact target navigation and writing accessibility-report.html."
        .to_owned(),
))
}
```

When creating the permission handler, set the new field and append the built-in tool:

<!-- code-id: 09-interactive-html-report-rust-2 -->
```rust
config.working_directory = Some(working_directory.clone());
config.available_tools = Some(vec![
    "accessibility_rule_lookup".to_owned(),
    "read_latest_accessibility_snapshot".to_owned(),
    "playwright-browser_navigate".to_owned(),
    "builtin:apply_patch".to_owned(),
]);
let config = config.with_permission_handler(Arc::new(ScopedPermissions {
    target: target.clone(),
    report_path: working_directory.join("accessibility-report.html"),
}));
```

Replace `report_prompt`:

<!-- code-id: 09-interactive-html-report-rust-3 -->
```rust
fn report_prompt(target: &Url) -> String {
    format!(
        r#"Prepare an evidence-based accessibility review of {target}.
1. Use browser_navigate to open that exact URL.
2. Call read_latest_accessibility_snapshot to inspect its accessibility tree.
3. Identify three to five high-confidence issues supported by the snapshot.
4. Call accessibility_rule_lookup for each issue before recommending a fix.
5. Use apply_patch to create exactly accessibility-report.html in the current working directory.

Write one complete, standalone HTML document. Use semantic HTML, embedded CSS, and embedded
JavaScript only; do not use external assets, URLs, or libraries. Include a title, target URL,
finding count, review limits, and one finding card per supported issue with its evidence, WCAG
criterion, and remediation. Add an accessible text filter that updates a visible result count
and filters cards by finding name, criterion, or evidence. Escape all finding text before
inserting it into HTML. Make keyboard focus visible.

Do not write any other file. After the write succeeds, respond only with:
Created accessibility-report.html"#
    )
}
```

At module scope in src/main.rs; artifact.rs already survives whole-main replacement.

<!-- code-id: 09-html-rust-artifact-import -->
```rust
mod artifact;
use artifact::{capture_artifact_state, verify_artifact_update};
```


Inside the existing response_result timeout's async block, replace only stream_response!(session, report_prompt(&target)); keep its Ok, timeout conversion, session disconnect, and client stop. Works directly after Step 6 or after Step 8.

<!-- code-id: 09-html-rust-artifact-check -->
```rust
let before = capture_artifact_state(&working_directory, "accessibility-report.html")?;
println!("Model HTML response (not file verification):");
stream_response!(session, report_prompt(&target));
verify_artifact_update(&before)?;
println!(
    "Verified a new or changed nonempty accessibility-report.html. Review its source and behavior before use."
);
```

:::

:::language java
## Scope the Java write permission

In `src/main/java/workshop/AccessibilityReport.java`, add `isReportWrite` as a class method.
The navigation checks stay in the supplied `WorkshopPermissionHandler.java`:

<!-- code-id: 09-interactive-html-report-java-1 -->
```java
private static boolean isReportWrite(Map<String, Object> request, Path workingDirectory) {
    if (request == null || !(request.get("fileName") instanceof String fileName) || fileName.isBlank()
            || (request.containsKey("requestSandboxBypass")
                && !Boolean.FALSE.equals(request.get("requestSandboxBypass")))) {
        return false;
    }
    try {
        Path allowed = workingDirectory.toAbsolutePath().normalize().resolve("accessibility-report.html");
        Path candidate = workingDirectory.toAbsolutePath().normalize().resolve(Path.of(fileName)).normalize();
        return candidate.equals(allowed) && !Files.isSymbolicLink(allowed)
                && !Files.isDirectory(allowed, LinkOption.NOFOLLOW_LINKS);
    } catch (java.nio.file.InvalidPathException exception) {
        return false;
    }
}
```

> **Strict Java policy:** The pinned SDK exposes permission payload fields. Keep exact-target
> navigation and exact-file write checks; missing or malformed fields are rejected. Do not
> broaden permissions to work around a rejected request.

Replace the session try-with-resources block inside the client block with these artifact
capture, run, and verification statements. Keep the one-URL parser unchanged:

<!-- code-id: 09-interactive-html-report-java-2 -->
```java
var artifact = ArtifactVerifier.captureArtifactState(
        workingDirectory, "accessibility-report.html");
try (var session = client.createSession(config).get()) {
    ResponseStreamer.sendAndPrint(session, reportPrompt(target));
}
ArtifactVerifier.verifyArtifactUpdate(artifact);
System.out.println("Verified a new or changed accessibility-report.html. Review its source and accessibility before use.");
```

In the existing configuration chain, replace its available-tools list and permission callback
with the following settings. Keep the MCP server and any selected model. Retain the imports of
`PermissionRequestResult` and `CompletableFuture` from earlier steps. Use the same working directory
in the configuration and artifact capture:

<!-- code-id: 09-interactive-html-report-java-3 -->
```java
.setWorkingDirectory(workingDirectory.toString())
.setAvailableTools(List.of(
        "accessibility_rule_lookup",
        "read_latest_accessibility_snapshot",
        "playwright-browser_navigate",
        "builtin:apply_patch"))
// Keep the existing MCP server configuration and any selected model.
.setOnPermissionRequest((request, invocation) -> {
    if (request != null && "write".equals(request.getKind())
            && !Boolean.TRUE.equals(request.getManagedApprovalRequired())
            && isReportWrite(request.getExtensionData(), workingDirectory)) {
        return CompletableFuture.completedFuture(PermissionRequestResult.approveOnce());
    }
    return WorkshopPermissionHandler.createForTarget(target).handle(request, invocation);
})
```

Replace `reportPrompt`:

<!-- code-id: 09-interactive-html-report-java-4 -->
```java
private static String reportPrompt(URI target) {
    return """
            Prepare an evidence-based accessibility review of %s.
            1. Use browser_navigate to open that exact URL.
            2. Call read_latest_accessibility_snapshot to inspect its accessibility tree.
            3. Identify three to five high-confidence issues supported by the snapshot.
            4. Call accessibility_rule_lookup for each issue before recommending a fix.
            5. Use apply_patch to create exactly accessibility-report.html in the current working directory.

            Write one complete, standalone HTML document. Use semantic HTML, embedded CSS, and embedded
            JavaScript only; do not use external assets, URLs, or libraries. Include a title, target URL,
            finding count, review limits, and one finding card per supported issue with its evidence, WCAG
            criterion, and remediation. Add an accessible text filter that updates a visible result count
            and filters cards by finding name, criterion, or evidence. Escape all finding text before
            inserting it into HTML. Make keyboard focus visible.

            Do not write any other file. After the write succeeds, respond only with:
            Created accessibility-report.html""".formatted(target);
}
```
:::

## Run it

:::language dotnet
```bash
dotnet run
```
:::
:::language nodejs
```bash
npm start -- "{{TARGET_APP_URL}}"
```
:::
:::language python
```bash
python main.py "{{TARGET_APP_URL}}"
```
:::
:::language go
```bash
go run . "{{TARGET_APP_URL}}"
```
:::
:::language rust
```bash
cargo run -- "{{TARGET_APP_URL}}"
```
:::
:::language java
```bash
mvn compile exec:java -Dexec.args="{{TARGET_APP_URL}}"
```
:::

Use the workshop target:

<!-- code-id: 09-interactive-html-report-shared-1 -->
```text
{{TARGET_APP_URL}}
```

The tool transcript should include the existing navigation, snapshot, and catalog calls plus an
`apply_patch` write. Open `accessibility-report.html` in a browser. Type a word from a
finding, WCAG criterion, or evidence line into the filter and confirm the visible cards and result
count update.

<details>
<summary>Troubleshooting this extension</summary>

| Symptom | Fix |
|---|---|
| The write is rejected | Keep the exact output path and inspect the request; do not broaden permissions to force a successful run. |
| More than one file is requested | The strict handler rejects other paths. A rejected batch can prevent all writes, so check the verified artifact result. |
| The filter does not work | The generated document must include embedded JavaScript that filters cards and updates its live result count. Rerun once if the agent omitted a required element. |
| The report loads without styling | Keep CSS and JavaScript embedded in the one HTML file; the prompt intentionally disallows external assets and libraries. |

</details>

> **The extension is complete when:** `accessibility-report.html` opens locally and
> filters evidence-grounded findings after the application verifies an update. The strict handler
> approves no other model-requested output path; a generated file still requires human review.

## Check your understanding

Why is allowing one named built-in write tool safer than broadly approving filesystem access?

<details>
<summary>Check your answer</summary>

`builtin:apply_patch` exposes only the required editing capability, and the default permission
callback binds that capability to one normalized output path. The model cannot use shell commands
or write another file, while the existing local tools and scoped Playwright navigation remain
unchanged. A model's completion message does not establish that the requested file was updated;
the application checks that separately.

</details>

## Learn more

- [Pre-tool-use hook](https://github.com/github/copilot-sdk/blob/main/docs/hooks/pre-tool-use.md):
  approving, denying, or rewriting a tool call before it runs, in code rather than in a prompt.
- [Hooks reference](https://github.com/github/copilot-sdk/blob/main/docs/hooks/README.md):
  every hook the SDK exposes, and the input each one receives.
- [Local CLI setup](https://github.com/github/copilot-sdk/blob/main/docs/setup/local-cli.md):
  controlling which CLI the SDK starts, which decides where a written file lands.

Return to [Step 7: Run and explain the application](07-run-explain.md).
