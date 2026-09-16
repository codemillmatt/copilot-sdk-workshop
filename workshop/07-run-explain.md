# Step 7: Run and explain the application

> **Pace:** Self-paced

## What you'll be ready to explain

You'll run the complete application and explain its state, tool boundaries, permission boundary,
and report limitations.

## See the whole agent system

:::language dotnet
The finished application is an agent host. Its session coordinates a model, an application-owned
function, and a browser running in another process:

<!-- code-id: 07-run-explain-dotnet-1 -->
```text
Console application
  |
  +-- CopilotClient -------- runtime connection
       |
       `-- CopilotSession --- one conversation and its context
            |
            +-- accessibility_rule_lookup
            |     same process, application-owned data
            |
            +-- read_latest_accessibility_snapshot
            |     same process, bounded current-run evidence
            |
            `-- Playwright MCP
                  separate process, scoped permission handler
                       |
                       `-- Browser target
```
:::

:::language nodejs
The finished application is an agent host. Its session coordinates a model, an application-owned
function, and a browser running in another process:

<!-- code-id: 07-run-explain-nodejs-1 -->
```text
Node.js application
  |
  +-- CopilotClient -------- runtime connection
       |
       `-- CopilotSession --- one conversation and its context
            |
            +-- accessibility_rule_lookup
            |     same process, application-owned data
            |
            +-- read_latest_accessibility_snapshot
            |     same process, bounded current-run evidence
            |
            `-- Playwright MCP
                  separate process, scoped permission handler
                       |
                       `-- Browser target
```

The completed report is also in
[`finished/nodejs/accessibility-report`](https://github.com/jamesmontemagno/copilot-sdk-workshop/tree/main/finished/nodejs/accessibility-report).
:::

:::language python
The finished application is an agent host. Its session coordinates a model, an application-owned
function, and a browser running in another process:

<!-- code-id: 07-run-explain-python-1 -->
```text
Python application
  |
  +-- CopilotClient -------- runtime connection
       |
       `-- session ---------- one conversation and its context
            |
            +-- accessibility_rule_lookup
            |     same process, application-owned data
            |
            +-- read_latest_accessibility_snapshot
            |     same process, bounded current-run evidence
            |
            `-- Playwright MCP
                  separate process, scoped permission handler
                       |
                       `-- Browser target
```

The completed report is also in
[`finished/python/accessibility-report`](https://github.com/jamesmontemagno/copilot-sdk-workshop/tree/main/finished/python/accessibility-report).
:::

:::language go
The finished application is an agent host. Its session coordinates a model, an application-owned
function, and a browser running in another process:

<!-- code-id: 07-run-explain-go-1 -->
```text
Go application
  |
  +-- Client ---------------- runtime connection
       |
       `-- Session ---------- one conversation and its context
            |
            +-- accessibility_rule_lookup
            |     same process, application-owned data
            |
            +-- read_latest_accessibility_snapshot
            |     same process, bounded current-run evidence
            |
            `-- Playwright MCP
                  separate process, scoped permission handler
                       |
                       `-- Browser target
```
:::

:::language rust
The finished application is an agent host. Its session coordinates a model, an application-owned
function, and a browser running in another process:

<!-- code-id: 07-run-explain-rust-1 -->
```text
Rust application
  |
  +-- Client ---------------- runtime connection
       |
       `-- Session ---------- one conversation and its context
            |
            +-- accessibility_rule_lookup
            |     same process, application-owned data
            |
            +-- read_latest_accessibility_snapshot
            |     same process, bounded current-run evidence
            |
            `-- Playwright MCP
                  separate process, scoped permission handler
                       |
                       `-- Browser target
```
:::

:::language java
The finished application is an agent host. Its session coordinates a model, an application-owned
function, and a browser running in another process:

<!-- code-id: 07-run-explain-java-1 -->
```text
Java application
  |
  +-- CopilotClient -------- runtime connection
       |
       `-- session ---------- one conversation and its context
            |
            +-- accessibility_rule_lookup
            |     same process, application-owned data
            |
            +-- read_latest_accessibility_snapshot
            |     same process, bounded current-run evidence
            |
            `-- Playwright MCP
                  separate process, scoped permission handler
                       |
                       `-- Browser target
```
:::

## Take the design beyond this workshop

Understanding these boundaries lets you reuse the design in another application instead of only
reproducing the workshop code. A database lookup, deployment service, or issue tracker may use
different tools, but the same ownership and trust questions apply.

:::language dotnet
The complete flow is
`URL -> Playwright inspection -> C# WCAG lookup -> structured accessibility report`.
:::

:::language nodejs
The complete flow is
`URL -> Playwright inspection -> TypeScript WCAG lookup -> structured accessibility report`.
:::

:::language python
The complete flow is
`URL -> Playwright inspection -> Python WCAG lookup -> structured accessibility report`.
:::

:::language go
The complete flow is
`URL -> Playwright inspection -> Go WCAG lookup -> structured accessibility report`.
:::

:::language rust
The complete flow is
`URL -> Playwright inspection -> Rust WCAG lookup -> structured accessibility report`.
:::

:::language java
The complete flow is
`URL -> Playwright inspection -> Java WCAG lookup -> structured accessibility report`.
:::

## Take a victory lap

There is no code to change. Keep the Step 6 implementation in place so this run tests the
application you built.

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

> **Strict Java policy:** The pinned SDK exposes permission payload fields. Keep exact-target
> navigation and exact-file write checks; missing or malformed fields are rejected. Do not
> broaden permissions to work around a rejected request.
:::
Use the workshop target:

<!-- code-id: 07-run-explain-shared-1 -->
```text
{{TARGET_APP_URL}}
```

Watch for all five stages:

1. The client connects and creates one session.
2. Playwright navigates to the exact target and creates an accessibility snapshot.
3. The narrow local reader returns that current-run snapshot.
4. The local catalog is called for browser-supported findings.
5. The response follows the report contract and states its limits.

:::language dotnet
Your transcript will vary, but it should have this shape:

<!-- code-id: 07-run-explain-dotnet-2 -->
```text
=== Accessibility Report Generator ===

Enter URL to analyze: {{TARGET_APP_URL}}

Connected to the Copilot runtime: ...
Analyzing: {{TARGET_APP_URL}}

[tool:start] browser_navigate / playwright-browser_navigate
[tool:done] success=True
[tool:start] read_latest_accessibility_snapshot
[tool:done] success=True
[tool:start] accessibility_rule_lookup
[tool:done] success=True
...

# Accessibility review
## Finding 1: ...
- Evidence: ...
- WCAG criterion: ...
- Recommended remediation: ...
## Review limits
...
```
:::

:::language nodejs
Your transcript will vary, but it should have this shape:

<!-- code-id: 07-run-explain-nodejs-2 -->
```text
[tool:start] browser_navigate
[tool:done] success=true
[tool:start] read_latest_accessibility_snapshot
[tool:done] success=true
[tool:start] accessibility_rule_lookup
[tool:done] success=true
...

# Accessibility review
## Finding 1: ...
- Evidence: ...
- WCAG criterion: ...
- Recommended remediation: ...
## Review limits
...
```

`streamResponse` prints tool start/done lines and streams the assistant text to stdout.
:::

:::language python
Your transcript will vary, but it should have this shape:

<!-- code-id: 07-run-explain-python-2 -->
```text
[tool:start] browser_navigate
[tool:done] success=True
[tool:start] read_latest_accessibility_snapshot
[tool:done] success=True
[tool:start] accessibility_rule_lookup
[tool:done] success=True
...

# Accessibility review
## Finding 1: ...
- Evidence: ...
- WCAG criterion: ...
- Recommended remediation: ...
## Review limits
...
```

`main.py` launches `report.main`, which waits on `session.idle` after streaming deltas.
:::

:::language go
Your transcript will vary, but it should have this shape:

<!-- code-id: 07-run-explain-go-2 -->
```text
# Accessibility review
## Finding 1: ...
- Evidence: ...
- WCAG criterion: ...
- Recommended remediation: ...
## Review limits
...
```

Explain that `Client` owns the Copilot CLI lifecycle, the `Session` owns one conversation, and the
permission handler gates external navigation. The expected report is evidence-bound.
:::

:::language rust
Your transcript will vary, but it should have this shape:

<!-- code-id: 07-run-explain-rust-2 -->
```text
# Accessibility review
## Finding 1: ...
- Evidence: ...
- WCAG criterion: ...
- Recommended remediation: ...
## Review limits
...
```

Explain that `Client` manages the runtime, `Session` dispatches events, typed tools are app-owned,
and the permission handler trusts only exact navigation.
:::

:::language java
Your transcript will vary, but it should have this shape:

<!-- code-id: 07-run-explain-java-2 -->
```text
# Accessibility review
## Finding 1: ...
- Evidence: ...
- WCAG criterion: ...
- Recommended remediation: ...
## Review limits
...
```

Explain that Maven compiles the Java 17 application, `CopilotClient` manages the runtime, and tools
remain scoped. The permission helper validates the canonical URL and rejects missing or
nonmatching request fields. The snapshot reader is a separate local tool with no path argument.
:::

The controlled target intentionally includes browser-observable issues: a missing text alternative,
no `main` landmark, an illogical heading sequence, and a textbox without an accessible name.
Compare the report with the
[published target HTML](https://github.com/jamesmontemagno/copilot-sdk-workshop/blob/main/docs/target-app/index.html);
do not accept a finding that is absent from both the snapshot and source.

<details>
<summary>Troubleshooting the complete run</summary>

| Symptom | Fix |
|---|---|
| A known issue is omitted | Agent output can vary. Rerun once, but require evidence rather than forcing a predetermined answer. |
| A reported issue is not in the page | Reject it as ungrounded; the prompt requires specific browser evidence. |
| A tool is denied | Check that `browser_navigate` uses the exact entered target. |
| The reader finds no snapshot | Keep the prompt order: navigate before calling `read_latest_accessibility_snapshot`. |
| The runtime cannot start | Re-authenticate with `copilot login`, confirm the CLI is on `PATH`, and retry the run command for your language. |

</details>

> **You have completed the core workshop when:** the report is grounded, the tool names are visible,
> and you can answer the architecture questions below without reading the code.

## Check your understanding

1. What state belongs to the session?
2. Why is the WCAG catalog local?
3. Why is Playwright external?
4. Where are permissions enforced?
5. What changes when another MCP server is added?

<details>
<summary>Compare your explanation</summary>

1. The session owns one conversation's messages, model response, and tool results.
2. The application owns the catalog data and deterministic lookup, so the function stays local.
3. Playwright is a reusable browser capability with its own Node.js process and dependencies.
4. The MCP tool allowlist exposes only navigation, and the permission handler approves only
   the exact target. The trusted local reader accepts no path and reads only a new generated
   snapshot; the catalog is also read-only. Those application-owned tools skip permission.
5. Add the server configuration, expose only needed tools, define its trust policy, and keep
   observing its calls through the same session event stream.

</details>

## Keep exploring

### Make one change without a complete-file recipe

Save your working entrypoint. Add a small local tool named `review_policy` that returns a fixed
application-owned sentence: `Report only findings supported by the snapshot and name the review limits.`
Use the local-tool API from Step 3, register the implementation, and add its name to the existing
allowlist without removing any of the three core tools. Ask the agent to consult it during review.

Before running, explain why this belongs in a local callback rather than a new MCP process.
Inspect the tool's direct result and the configured allowlist first. A model run may choose not
to call it; a convincing report alone is not evidence of a call.

<details>
<summary>Compare your design</summary>

The tool needs a name, a description explaining when to use it, an empty argument schema, and a
handler returning the fixed policy. The application owns both the data and execution, so no
external process is needed. Registration supplies the implementation; the allowlist exposes it;
the prompt only requests its use. Look for its tool event before claiming the model consulted it.

</details>

Keep a copy of this practice work, then restore the saved baseline entrypoint before either
optional extension. The finished reporter is the three-tool baseline, not this practice variant.

Try [Optional: Select a model](08-model-selection.md) if your application needs explicit control
over model choice, then continue to [Optional: Generate an interactive HTML report](09-interactive-html-report.md).
You can also go straight to the HTML report extension. Otherwise, the core workshop is complete.

:::language dotnet
Complete references:

- [Finished accessibility reporter](https://github.com/jamesmontemagno/copilot-sdk-workshop/tree/main/finished/dotnet/accessibility-report)
- [GitHub Copilot SDK for .NET](https://github.com/github/copilot-sdk/tree/main/dotnet)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)
:::

:::language nodejs
Complete references:

- [Finished accessibility reporter](https://github.com/jamesmontemagno/copilot-sdk-workshop/tree/main/finished/nodejs/accessibility-report)
- [GitHub Copilot SDK for Node.js](https://github.com/github/copilot-sdk/tree/main/nodejs)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)
:::

:::language python
Complete references:

- [Finished accessibility reporter](https://github.com/jamesmontemagno/copilot-sdk-workshop/tree/main/finished/python/accessibility-report)
- [GitHub Copilot SDK for Python](https://github.com/github/copilot-sdk/tree/main/python)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)
:::

:::language go
Complete references:

- [Finished accessibility reporter](https://github.com/jamesmontemagno/copilot-sdk-workshop/tree/main/finished/go/accessibility-report)
- [GitHub Copilot SDK for Go](https://github.com/github/copilot-sdk/tree/main/go)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)

If the CLI is missing, install it rather than granting broader permissions.
:::

:::language rust
Complete references:

- [Finished accessibility reporter](https://github.com/jamesmontemagno/copilot-sdk-workshop/tree/main/finished/rust/accessibility-report)
- [GitHub Copilot SDK for Rust](https://github.com/github/copilot-sdk/tree/main/rust)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)

If it cannot start, install and authenticate the Copilot CLI.
:::

:::language java
Complete references:

- [Finished accessibility reporter](https://github.com/jamesmontemagno/copilot-sdk-workshop/tree/main/finished/java/accessibility-report)
- [GitHub Copilot SDK for Java](https://github.com/github/copilot-sdk/tree/main/java)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)

If the runtime is unavailable, install the Copilot CLI; do not replace Maven with JBang or Gradle.
:::

## Learn more

The workshop application runs on your machine. These pages cover what changes when the same design
moves somewhere else.

- [Backend services](https://github.com/github/copilot-sdk/blob/main/docs/setup/backend-services.md):
  running the SDK server-side against a headless CLI instead of a local one.
- [Scaling and multi-tenancy](https://github.com/github/copilot-sdk/blob/main/docs/setup/scaling.md):
  horizontal scaling and the isolation patterns that keep one user's session out of another's.
- [OpenTelemetry instrumentation](https://github.com/github/copilot-sdk/blob/main/docs/observability/opentelemetry.md):
  tracing tool calls and turns once the agent runs where you cannot watch the terminal.
- [Microsoft Agent Framework integration](https://github.com/github/copilot-sdk/blob/main/docs/integrations/microsoft-agent-framework.md):
  placing a Copilot session inside a larger multi-agent workflow.
