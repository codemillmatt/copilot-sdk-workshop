# Museum Exhibit Studio

This Go sample uses the GitHub Copilot SDK as a focused museum-curation harness. The app now has a
two-file shape:

- `curator.go` contains the pre-built helper API: approved fact sets, fact bounds, response
  streaming, structural validation, Wikipedia permissions, source extraction, the optional
  `exhibit.html` write permission, and terminal helpers.
- `main.go` contains the learner-authored orchestration: prompts, session configuration, console
  flow, and cleanup.

## Run the sample

From this directory:

```bash
go run .
```

Set `COPILOT_MODEL` to select the generation model; otherwise the runtime chooses its default. An
authenticated GitHub Copilot CLI is required.

Build without contacting a model or Wikipedia:

```bash
go build -mod=readonly ./...
```

## What the sample teaches

Generation uses a replacement system message, an allowlist naming exactly one application-owned
tool (`approved_fact_lookup`, which returns the bounded approved facts and skips permission
requests), denial of unexpected permissions, event
streaming, and a 120-second timeout. Optional Wikipedia research runs in a separate 90-second
session with only scoped search and article-read tools plus a deny-by-default permission handler.
Research is shown as background for the human curator only. Its trailing `## Sources` section
contains model-reported links, not verified evidence that the pages exist or were consulted.
Research findings are never merged into the approved facts used for exhibit generation.

After generation, deterministic validation checks one H1, required sections, a 100-140-word
narrative, exactly three numbered visitor questions ending in `?`, and prohibited software terms.
Model-reported Wikipedia sources are printed after the exhibit, explicitly marked unverified.
Check the links and their support for the research yourself. Successful research without usable
parsed citations produces an explicit notice. Structural validation remains advisory.

Optionally, the app can ask Copilot to create `exhibit.html` with `builtin:apply_patch`. That session
allows only a single normalized write to `exhibit.html` in the application working directory and
rejects every other file, shell, or MCP permission request. The HTML prompt requires a standalone
semantic document with embedded CSS and JavaScript, a human-review caveat, and an accessible question
filter. `CaptureArtifactState(workingDirectory, fileName)` records the exact target and its prior
content fingerprint before the session; `VerifyArtifactUpdate(snapshot)` requires a newly created
or content-changed nonempty regular nonsymlink file afterward. Missing, empty, unchanged, unreadable,
directory, and symlink outputs fail verification without deleting the previous artifact.
File verification does not prove factual accuracy, HTML safety, accessibility, or absence of external
assets; review the page and its source before use.

This is the application a learner ends up with after the museum lessons, not a separate reference
architecture. The entrypoint keeps one small session runner that starts the client, creates the
session, enforces the timeout, rejects blank output, and cleans up on every path; the research,
generation, and optional HTML steps reuse it with different session configurations. Follow the
track from
[`workshop/museum-00-preflight.md`](https://github.com/jamesmontemagno/copilot-sdk-workshop/blob/main/workshop/museum-00-preflight.md).
