# Copilot SDK Workshop

Build an AI-powered accessibility reviewer with .NET and the GitHub Copilot SDK.

In this self-guided workshop, you'll:

1. Create a Copilot client and conversation session.
2. Stream responses through session events.
3. Expose application-owned Web Content Accessibility Guidelines (WCAG) data as a local C# tool.
4. Connect Playwright MCP through a scoped permission boundary.
5. Combine browser evidence and catalog guidance in a structured report.
6. Explain the ownership, process, and trust boundaries in the completed application.

Plan on about 90 minutes for the seven core steps. Machine setup happens separately in an untimed
preflight.

## Start the workshop

Open the GitHub Pages URL produced by the repository's **Deploy to GitHub Pages** workflow, then
select **Start workshop**. The site derives its Pages base URL at runtime, so there is no hardcoded
organization or user Pages hostname.

To preview the site from a clone:

```bash
git clone https://github.com/jamesmontemagno/copilot-sdk-workshop.git
cd copilot-sdk-workshop
python3 -m http.server 8000
```

Open <http://localhost:8000/docs/>. Do not open `step.html` with a `file://` URL; browsers block
the Markdown requests used by the lesson viewer.

## Prerequisites

- [.NET 10 SDK](https://learn.microsoft.com/dotnet/core/install/)
- [Node.js 22 or newer](https://nodejs.org/)
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli)
- GitHub Copilot subscription or trial
- Microsoft Edge (the workshop default) or Google Chrome

Preflight walks through installation checks, authentication, OS-specific commands, expected
output, and troubleshooting.

## Repository layout

```text
copilot-sdk-workshop/
|-- docs/                         GitHub Pages site and controlled target page
|-- workshop/                     Preflight, seven core lessons, optional extension
|-- start/HelloCopilotSDK/        Learner starter with WCAG data and permission helper
|-- checkpoints/                  Compiling state after each build step
|-- samples/
|   |-- hello-copilot-sdk/        Completed local-tool example
|   `-- accessibility-report/     Completed local + MCP reporter
|-- src/BlazorApp/                Source counterpart of the deployed target
|-- scripts/                      Deterministic content and build validation
`-- .github/workflows/            Disabled validation and Pages workflows
```

## Validate a change

```bash
bash scripts/validate-workshop.sh
```

The command checks lesson structure, internal links, site behavior hooks, and checkpoint coverage.
It also builds the starter, every checkpoint, both samples, and the Blazor target.

## Deployment

The repository's workflows are currently disabled. Their definitions are preserved with a
`.disabled` suffix under `.github/workflows/`; remove that suffix to re-enable them.

After re-enabling the workflows, enable GitHub Pages in repository settings and choose
**GitHub Actions** as the source.

## References

- [GitHub Copilot SDK for .NET](https://github.com/github/copilot-sdk/tree/main/dotnet)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## License

This workshop is provided as-is for educational purposes.
