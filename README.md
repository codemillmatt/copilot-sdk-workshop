# Copilot SDK Workshops

Choose one of two hands-on GitHub Copilot SDK workshops in .NET, Node.js/TypeScript, Python, Go,
Rust, or Maven Java:

- **Accessibility Reviewer:** build an SDLC developer tool that inspects a web page, consults
  application-owned WCAG guidance, and produces an evidence-based report.
- **Museum Exhibit Studio:** build a non-SDLC curator that transforms educator-approved facts into
  visitor-ready exhibit copy behind deterministic application boundaries.

Across the workshops, you'll:

1. Create a Copilot client and conversation session.
2. Separate durable agent policy from task-specific data.
3. Choose between local tools, MCP tools, and a tightly scoped single-tool allowlist.
4. Enforce capability, input, timeout, validation, and lifecycle boundaries in application code.
5. Explain what the model can infer and what the application must prove.

Both workshops are self-paced. Complete the checks and short exercises before moving on;
machine setup happens separately in each workshop's preflight. No measured completion time is claimed.

## Start the workshop

Open the GitHub Pages URL produced by the repository's **Deploy to GitHub Pages** workflow. Choose a
workshop outcome, choose a language, then start the selected workshop. The site derives its Pages
base URL at runtime, so there is no hardcoded organization or user Pages hostname.

To preview the site from a clone:

```bash
git clone https://github.com/jamesmontemagno/copilot-sdk-workshop.git
cd copilot-sdk-workshop
python3 -m http.server 8000
```

Open <http://localhost:8000/docs/>. Do not open `step.html` with a `file://` URL; browsers block
the Markdown requests used by the lesson viewer.

## Prerequisites

Install the runtime for **your selected language**, not every runtime below. Both tracks also
need an authenticated Copilot CLI. The accessibility browser lesson and museum Wikipedia lesson
use Node.js/npm to start their MCP servers, even when the application uses another language.

- [.NET 10 SDK](https://learn.microsoft.com/dotnet/core/install/)
- [Node.js 22.12 or newer](https://nodejs.org/)
- [Python 3.11 or newer](https://www.python.org/downloads/)
- [Go 1.24 or newer](https://go.dev/dl/)
- [Rust 1.94 or newer](https://rustup.rs/)
- [Java 17 or newer](https://adoptium.net/) and [Maven](https://maven.apache.org/install.html)
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli)
- GitHub Copilot subscription or trial
- Microsoft Edge (the accessibility workshop default) or Google Chrome for browser inspection

Preflight walks through installation checks, authentication, OS-specific commands, expected
output, and troubleshooting.

Prompts and tool results are sent to the configured model service. Requests can consume your
account's usage allowance. Use the public sample data, not private pages, credentials, or
confidential facts. A local tool runs locally; its returned text can still leave the machine.

## Run a completed sample

For museum quickstarts, open `finished/<language>/museum-exhibit-studio/README.md`.
For the accessibility reporter, change into `finished/<language>/accessibility-report` and run
the restore command, then the launch command below. Replace `TARGET_URL` with the controlled
target URL shown by the workshop site; .NET asks for that URL interactively. These samples do
not require editing a starter or completing the workshop first.

| Language | Restore | Launch |
| --- | --- | --- |
| .NET | `dotnet restore` | `dotnet run` |
| Node.js | `npm ci --ignore-scripts --no-audit --fund=false` | `npm start -- "TARGET_URL"` |
| Python (Bash) | `python3 -m venv .venv`, then `.venv/bin/python -m pip install -r requirements.txt` | `.venv/bin/python main.py "TARGET_URL"` |
| Python (PowerShell) | `py -3 -m venv .venv`, then `.venv/Scripts/python.exe -m pip install -r requirements.txt` | `.venv/Scripts/python.exe main.py "TARGET_URL"` |
| Go | `go mod download` | `go run . "TARGET_URL"` |
| Rust | `cargo fetch --locked` | `cargo run --locked -- "TARGET_URL"` |
| Java | `mvn dependency:go-offline` | `mvn compile exec:java -Dexec.args="TARGET_URL"` |

## Repository layout

```text
copilot-sdk-workshop/
|-- docs/                         GitHub Pages site and controlled target page
|-- workshop/                     Two complete workshop tracks and optional extensions
|-- instructor/museum/            Trainer notes and the presentation source
|-- start-accessibility/          Accessibility Reviewer starters in all six languages
|-- start-museum/                 Museum Exhibit Studio starters in all six languages
|-- finished/dotnet/
|   |-- hello-copilot-sdk/        Completed local-tool example in every language
|   |-- accessibility-report/     Completed .NET local + MCP reporter
|   `-- museum-exhibit-studio/    Grounded museum curator sample, one application-owned tool
|-- finished/nodejs/              Completed TypeScript projects
|-- finished/python/              Completed Python projects
|-- finished/go/                  Completed Go projects
|-- finished/rust/                Completed Rust projects
|-- finished/java/                Completed Maven Java projects
|-- src/BlazorApp/                Source counterpart of the deployed target
|-- scripts/                      Deterministic content and build validation
`-- .github/workflows/            Disabled validation and Pages workflows
```

## Validate a change

```bash
bash scripts/validate-workshop.sh
```

The command checks lesson structure, internal links, site behavior hooks, and project coverage.
It then runs browser-independent language-selection tests and restores, builds, or syntax-checks every
accessibility and museum starter, every finished project, and the Blazor target without authenticating
Copilot, launching a browser, or sending a prompt. Maintainer checks under `scripts/tests/` exercise
the deterministic contracts; learner projects still contain no test harnesses or fixtures.
Checkpoint replay uses canonical lesson code in temporary project copies rather than overwriting
the learner's work. It also checks complete references and both routes into the accessibility HTML
extension. Python checkpoints are syntax- and import-checked, not statically type-checked.

Pass a language ID to run one smoke-build target:

```bash
bash scripts/validate-workshop.sh nodejs
```

Pull requests run content validation and all six language smoke builds as separate GitHub Actions
jobs, so a failure identifies the affected SDK track.

Code fences used by replay have stable `code-id` comments. Keep an existing ID when editing that
example. Add or update its exact edit operations in `scripts/checkpoints/<language>.json` when the
learner's procedure changes. Missing or ambiguous replacement anchors fail explicitly. Do not copy a
finished application into a checkpoint recipe as a substitute for replaying the taught edits.

## Museum Exhibit Studio workshop

Museum Exhibit Studio starters live under `start-museum/<language>`, with completed references under
`finished/<language>/museum-exhibit-studio`. Each starter ships one pre-built curator helper module
that learners never edit: approved fact sets and their bounds, a streaming printer, deterministic
exhibit validation, the scoped Wikipedia MCP server with its deny-by-default permission handler, the
single-file `exhibit.html` write permission, and small terminal prompts.

Learners work directly in `start-museum/<language>` and grow that one project across the
lessons, running it at every step. They write only the session setup, the curator and research
system messages, the prompt builders, one session runner that owns the lifecycle and guardrails, and
`main`. The finished sample is what a learner ends up with, not a separate reference architecture.

The learner-facing track begins at
[`workshop/museum-00-preflight.md`](workshop/museum-00-preflight.md), then runs through seven core
steps — first session, streaming, curator voice, approved facts, guardrails, structural checks, and
Wikipedia MCP research — plus an optional interactive `exhibit.html` capstone.

Rust checks isolate build output for independent project copies. Several samples share a package
name, so a cached binary from a different sample or a temporary test driver must not count as
validation of the current source. Downloaded Cargo dependencies can still use the normal registry
cache.

## Deployment

GitHub Pages is published from the root of the `gh-pages` branch. That branch contains the static
contents of `docs/`, the learner lessons under `workshop/`, and the instructor content required by
the direct instructor URL.

The repository's GitHub Actions workflows are disabled. Their definitions are preserved with a
`.disabled` suffix under `.github/workflows/`.

## References

- [GitHub Copilot SDK for .NET](https://github.com/github/copilot-sdk/tree/main/dotnet)
- [GitHub Copilot SDK for Node.js/TypeScript](https://github.com/github/copilot-sdk/tree/main/nodejs)
- [GitHub Copilot SDK for Python](https://github.com/github/copilot-sdk/tree/main/python)
- [GitHub Copilot SDK for Go](https://github.com/github/copilot-sdk/tree/main/go)
- [GitHub Copilot SDK for Rust](https://github.com/github/copilot-sdk/tree/main/rust)
- [GitHub Copilot SDK for Java](https://github.com/github/copilot-sdk/tree/main/java)
- [Copilot SDK cookbook](https://github.com/github/copilot-sdk/tree/main/cookbook)
- [Copilot SDK API and source](https://github.com/github/copilot-sdk)
- [Install the GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## License

This workshop is provided as-is for educational purposes.
