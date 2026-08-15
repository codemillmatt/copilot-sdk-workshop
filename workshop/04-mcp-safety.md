# Step 4: Connect an external tool safely

> **Time:** 20 minutes

## What you'll connect

You'll start Playwright through MCP, limit navigation to the workshop target you provide, inspect
its accessibility tree, and report the page title.

## Meet MCP and its trust boundary

The **Model Context Protocol (MCP)** is a standard way to connect an agent to reusable capabilities
implemented outside your application. In this workshop, the SDK starts the Playwright MCP server
as a separate `npx` process. Playwright handles browser automation, while your application
configures the connection.

The process boundary is also a **trust boundary**. A permission handler decides whether each
requested external action may run.

## Reuse browser automation without giving it free rein

MCP lets you use Playwright's browser automation without recreating it as a C# callback. The
boundary also makes ownership explicit:

| Question | Local WCAG tool | Playwright MCP |
|---|---|---|
| Who implements it? | This application | External Playwright package |
| Where does it run? | Same .NET process | Separate Node.js process |
| What is it best for? | App-owned data and deterministic logic | Reusable browser capability |
| How is trust handled here? | Read-only tool skips permission | Tool list and custom handler restrict access |

The WCAG lookup and narrow snapshot reader stay in process.
`CopilotSession -> Playwright MCP -> browser` crosses a process boundary.

## Put Playwright behind guardrails

### 1. Accept one controlled target

At the top of `Program.cs`, after the `using` statements and before the banner, insert:

```csharp
if (args.Length is not 1 ||
    !Uri.TryCreate(args[0], UriKind.Absolute, out var targetUri) ||
    targetUri.Scheme is not ("http" or "https"))
{
    Console.Error.WriteLine("Usage: dotnet run --project workshop-app -- <http-or-https-url>");
    return;
}
```

### 2. Add Playwright MCP and scoped permissions

Replace the session configuration with:

```csharp
var workingDirectory = Directory.GetCurrentDirectory();

await using var session = await client.CreateSessionAsync(new SessionConfig
{
    Streaming = true,
    OnPermissionRequest = WorkshopPermissionHandler.CreateForTarget(targetUri),
    Tools =
    [
        AccessibilityRuleCatalog.CreateLookupTool(),
        PlaywrightSnapshotReader.CreateTool(workingDirectory)
    ],
    AvailableTools =
    [
        "accessibility_rule_lookup",
        "read_latest_accessibility_snapshot",
        "playwright-browser_navigate"
    ],
    McpServers = new Dictionary<string, McpServerConfig>
    {
        ["playwright"] = new McpStdioServerConfig
        {
            Command = "npx",
            Args = ["-y", "@playwright/mcp@0.0.78", "--browser=msedge"],
            WorkingDirectory = workingDirectory,
            Tools = ["browser_navigate"]
        }
    }
});
```

The browser argument uses Microsoft Edge, the workshop default. If you prepared Google Chrome
instead, use `--browser=chrome`.

`AvailableTools` keeps unrelated runtime tools out of the session. The MCP server's `Tools` list
exposes only navigation. In Playwright MCP 0.0.78, navigation writes its automatic accessibility
tree to `.playwright-mcp/`. The prebuilt `PlaywrightSnapshotReader` accepts no arguments and reads
only the newest Playwright snapshot created after the session started.

`browser_snapshot` stays off both allowlists because its optional `filename` argument can write a
file. The runtime can automatically allow MCP tools annotated as read-only without calling your
permission delegate, so a handler cannot reliably sanitize that argument. Removing the tool closes
the capability instead of relying on a prompt.

The reader accepts no path. It ignores pre-existing files, nested files, symbolic links, empty
files, and snapshots larger than 1 MB. Navigation is approved only when the complete canonical URL
matches the target supplied at startup. Scheme and host use URL-standard case-insensitive
comparison. Path, query, and fragment must match case-sensitively.

> **SDK note:** `PermissionHandler.ApproveAll` is provided by the SDK, but no built-in scoped handler
> exists. The starter therefore includes a hand-written delegate.

<details>
<summary>Inspect the prebuilt permission handler</summary>

`workshop-app/Helpers/WorkshopPermissionHandler.cs` returns `ApproveOnce` only for exact-target
navigation. Every other external request is rejected.

```csharp
public static Func<PermissionRequest, PermissionInvocation, Task<PermissionDecision>> CreateForTarget(
    Uri allowedTarget)
{
    return (request, _) =>
    {
        var decision = request switch
        {
            PermissionRequestMcp { ServerName: "playwright" } navigation
                when IsPlaywrightTool(navigation, "browser_navigate") &&
                     IsNavigationToTarget(navigation.Args, allowedTarget) =>
                PermissionDecision.ApproveOnce(),
            _ => PermissionDecision.Reject(
                "Only navigation to the exact target URL is allowed.")
        };

        return Task.FromResult(decision);
    };
}
```

The SDK currently prefixes MCP permission tool names with the server name (for example,
`playwright-browser_navigate`), while MCP configuration uses `browser_navigate`.
`IsPlaywrightTool` accepts those two exact forms rather than using a broad wildcard.

</details>

<details>
<summary>Inspect the prebuilt snapshot-reader boundary</summary>

`workshop-app/Helpers/PlaywrightSnapshotReader.cs` captures the set of existing snapshots when the
tool is created. Its tool callback accepts no model-supplied arguments, selects only a new direct
child named `page-*.yml`, rejects symbolic links and oversized files, then returns the text.

The adapter uses `SkipPermission = true` because it is read-only, uses application-selected
storage, and is implemented by the application. That is a narrower capability than a general file
reader.

</details>

### 3. Request browser evidence

Replace the final send call:

```csharp
Console.WriteLine($"\nInspecting: {targetUri.AbsoluteUri}\n");
await ResponseStreamer.SendAndPrintAsync(
    session,
    $"""
    Use browser_navigate to open {targetUri.AbsoluteUri}.
    Then use read_latest_accessibility_snapshot and report the page title
    plus one sentence describing its main content.
    """);
```

## Run it

```bash
dotnet run --project workshop-app -- "{{TARGET_APP_URL}}"
```

The first run may take longer while `npx` starts Playwright. Look for:

```text
[tool:start] playwright-browser_navigate
[tool:done] success=True
[tool:start] read_latest_accessibility_snapshot
[tool:done] success=True

Page title: Blazor Accessibility Target
```

<details>
<summary>Troubleshooting this run</summary>

| Symptom | Fix |
|---|---|
| `npx` cannot be started | Rerun the preflight MCP command and verify Node.js is on `PATH`. |
| Playwright cannot find a browser | Install Edge or Chrome, or configure an installed browser as described by Playwright MCP. |
| A permission is rejected | Use the exact target URL above. The handler intentionally denies other URLs and tools. |
| No current-run snapshot is available | Keep the prompt order: call `browser_navigate` before `read_latest_accessibility_snapshot`. |

</details>

> **You're ready to combine tools when:** the terminal shows named Playwright tool activity and
> prints the target page title.

## Check your understanding

Why is Playwright an MCP server here instead of another local C# callback?

<details>
<summary>Check your answer</summary>

Playwright provides reusable browser automation in its own process, with its own dependencies. MCP
connects it without moving browser logic into the application's domain code, and permissions
protect the process boundary.

</details>

<details>
<summary>Complete Step 4 checkpoint</summary>

The Step 4 checkpoint contains the complete project:
[`checkpoints/04-mcp-safety`](https://github.com/codemillmatt/copilot-sdk-workshop/tree/main/checkpoints/04-mcp-safety).

```csharp
using GitHub.Copilot;
using HelloCopilotSDK.Helpers;

if (args.Length is not 1 ||
    !Uri.TryCreate(args[0], UriKind.Absolute, out var targetUri) ||
    targetUri.Scheme is not ("http" or "https"))
{
    Console.Error.WriteLine("Usage: dotnet run --project workshop-app -- <http-or-https-url>");
    return;
}

Console.WriteLine("=== Scoped Playwright MCP access ===\n");

await using var client = new CopilotClient();
await client.StartAsync();

var ping = await client.PingAsync("workshop");
Console.WriteLine($"Connected to the Copilot runtime: {ping.Message}\n");

var workingDirectory = Directory.GetCurrentDirectory();

await using var session = await client.CreateSessionAsync(new SessionConfig
{
    Streaming = true,
    OnPermissionRequest = WorkshopPermissionHandler.CreateForTarget(targetUri),
    Tools =
    [
        AccessibilityRuleCatalog.CreateLookupTool(),
        PlaywrightSnapshotReader.CreateTool(workingDirectory)
    ],
    AvailableTools =
    [
        "accessibility_rule_lookup",
        "read_latest_accessibility_snapshot",
        "playwright-browser_navigate"
    ],
    McpServers = new Dictionary<string, McpServerConfig>
    {
        ["playwright"] = new McpStdioServerConfig
        {
            Command = "npx",
            Args = ["-y", "@playwright/mcp@0.0.78", "--browser=msedge"],
            WorkingDirectory = workingDirectory,
            Tools = ["browser_navigate"]
        }
    }
});

Console.WriteLine($"Inspecting: {targetUri.AbsoluteUri}\n");
await ResponseStreamer.SendAndPrintAsync(
    session,
    $"""
    Use browser_navigate to open {targetUri.AbsoluteUri}.
    Then use read_latest_accessibility_snapshot and report the page title
    plus one sentence describing its main content.
    """);
```

</details>

Continue to [Step 5: Combine local and MCP tools](05-combine-tools.md).
