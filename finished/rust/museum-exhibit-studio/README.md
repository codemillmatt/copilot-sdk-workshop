# Museum Exhibit Studio

This Rust sample uses the GitHub Copilot SDK as a focused, non-software-engineering agent harness. Pre-built helpers live in `src/lib.rs`; the learner-authored orchestration lives in `src/main.rs`.

## Run the sample

```bash
cargo run --manifest-path finished/rust/museum-exhibit-studio/Cargo.toml --locked
```

Set `COPILOT_MODEL` to select a generation model. The sample requires an authenticated GitHub Copilot CLI.

Check without contacting a model:

```bash
cargo check --locked --manifest-path finished/rust/museum-exhibit-studio/Cargo.toml
```

## What the sample teaches

The generation session uses a replacement curator system message, validates approved facts, streams with a 120-second timeout, allowlists exactly one application-owned tool (`approved_fact_lookup`, which returns the bounded approved facts and skips permission requests), denies unexpected permissions, rejects blank output, and prints advisory structural validation.

Optional Wikipedia research is separate: it exposes only scoped `search` and `readArticle` MCP tools,
uses a deny-by-default permission handler, asks for prose notes plus model-reported sources, and never
merges research into the approved facts. Sources are explicitly marked unverified: parsing does not
prove that links exist or pages were consulted. Check their contents and support yourself. Successful
research without usable parsed citations produces an explicit notice.

Optional HTML generation uses `builtin:apply_patch` with a single-file permission handler that can write only `exhibit.html` in the application working directory.

`capture_artifact_state(working_directory, file_name)` records the exact target and its prior content
fingerprint before the session. `verify_artifact_update(&snapshot)` requires a newly created or
content-changed nonempty regular nonsymlink file afterward. Missing, empty, unchanged, unreadable,
directory, and symlink outputs fail verification without deleting the previous artifact.
File verification does not prove factual accuracy, HTML safety, accessibility, or absence of external
assets; review the page and its source before use.

This is the application a learner ends up with after the museum lessons, not a separate reference
architecture. The entrypoint keeps one small session runner that starts the client, creates the
session, enforces the timeout, rejects blank output, and cleans up on every path; the research,
generation, and optional HTML steps reuse it with different session configurations. Follow the
track from
[`workshop/museum-00-preflight.md`](https://github.com/jamesmontemagno/copilot-sdk-workshop/blob/main/workshop/museum-00-preflight.md).
