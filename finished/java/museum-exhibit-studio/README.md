# Museum Exhibit Studio

This Maven CLI sample uses the GitHub Copilot SDK as a focused museum-curation agent. A museum educator chooses one of three approved fact sets or enters their own bounded facts, optionally streams scoped Wikipedia background research, generates visitor-facing exhibit copy, validates its structure, and can opt in to an `exhibit.html` capstone.

## Run

From this directory:

```bash
mvn compile exec:java
```

Set `COPILOT_MODEL` to select a model; otherwise the Copilot runtime chooses its default. The sample requires an authenticated GitHub Copilot CLI.

Compile without contacting a model:

```bash
mvn compile
```

## What it demonstrates

The learner-authored `MuseumExhibitStudio` entrypoint builds sessions directly with `new CopilotClient()`. The pre-built `Curator*` helpers provide approved facts, streaming, validation, scoped permissions, source extraction, and terminal prompts.

Prompt guidance is not an authorization boundary, so the application also:

- limits generation to exactly one application-owned tool, `approved_fact_lookup`, which returns the bounded approved facts, backed by a reject-all permission handler for everything else;
- limits research to the configured Wikipedia MCP server and `wikipedia-search` / `wikipedia-readArticle` through a deny-by-default permission handler;
- treats Wikipedia output as background notes only, displays **Model-reported Wikipedia sources (unverified):** from a trailing `## Sources` section, and never merges research into the approved facts;
- bounds input to 20 facts of at most 500 characters each before every model send;
- uses explicit timeouts, rejects blank exhibit output, and disconnects sessions / stops clients on success and failure;
- checks one H1, required sections, a 100-140-word narrative, exactly three numbered questions ending in `?`, and prohibited software vocabulary; and
- optionally allows `builtin:apply_patch` to write only `exhibit.html` in the application working directory.

The validator is advisory and cannot prove semantic factual grounding. Generated claims require human review. Verify each model-reported URL, article, and supporting claim yourself: parsing links does not prove that they exist or were consulted. Successful research without parseable citations produces an explicit notice.

## Optional HTML extension

When prompted, answer yes to generate `exhibit.html`. The pinned SDK 1.0.11 preserves permission extension fields. The handler approves only the exact normalized `fileName` in the application working directory; unknown, missing, malformed, and other-target requests stay denied.

Before the HTML session, the application captures the target's content hash. It reports a verified update only for a newly created or content-changed, nonempty regular nonsymlink file. Missing, empty, unchanged, directory, or symlink output cannot claim success. Previous files are never deleted to force an update. File verification does not establish factual accuracy, HTML safety, accessibility, or absence of external assets: inspect the source and review the page manually.

This is the application a learner ends up with after the museum lessons, not a separate reference
architecture. The entrypoint keeps one small session runner that starts the client, creates the
session, enforces the timeout, rejects blank output, and cleans up on every path; the research,
generation, and optional HTML steps reuse it with different session configurations. Follow the
track from
[`workshop/museum-00-preflight.md`](https://github.com/jamesmontemagno/copilot-sdk-workshop/blob/main/workshop/museum-00-preflight.md).
