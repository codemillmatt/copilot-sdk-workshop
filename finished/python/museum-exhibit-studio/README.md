# Museum Exhibit Studio

This Python sample uses the GitHub Copilot SDK as a focused museum exhibit
studio. The finished app has two modules:

- `curator.py` contains the pre-built workshop helpers: approved fact sets,
  bounded fact validation, streaming, deterministic structural checks, scoped
  Wikipedia permissions, scoped `exhibit.html` write permission, and terminal
  helpers.
- `main.py` contains the learner-authored orchestration: prompts, session
  configuration, console flow, validation, and optional HTML generation.

## Run the sample

From this directory, create an environment and install the pinned dependency:

PowerShell:

```powershell
py -3 -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe main.py
```

Bash:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python main.py
```

Set `COPILOT_MODEL` to select a model; otherwise the runtime chooses its
default. An authenticated GitHub Copilot CLI is required.

Wikipedia research requires Node.js because the research session launches the
pinned `wikipedia-mcp@1.0.3` package through `npx`. Declining research does not
start the MCP server.

Check the source without contacting a model:

```powershell
.venv/Scripts/python.exe -m py_compile main.py curator.py
```

## What the sample teaches

Generation allowlists exactly one application-owned tool,
`approved_fact_lookup`, which returns the bounded approved facts. It also uses a
replace-mode
curator system message, streaming, a 120-second timeout, and deterministic
structural validation. Imported modules have no side effects; `main.py` only
runs behind the `if __name__ == "__main__"` guard.

On Bash, use `.venv/bin/python -m py_compile main.py curator.py`.

Optional Wikipedia research is intentionally separate from generation. The
research session exposes only scoped Wikipedia search and article-read tools,
uses a deny-by-default permission handler, asks for a prose summary, and parses
a trailing `## Sources` list. Research notes and model-reported sources are shown to the
human, but they are never merged into the approved facts used to generate the
exhibit. There is no strict JSON contract and no proposed-addition approval
loop. Sources are explicitly unverified: parsing a link does not prove it exists, was consulted,
or supports a claim. A human must check it. Missing usable citations are reported.

After validation, the optional HTML capstone exposes only `builtin:apply_patch`
and approves writing exactly `exhibit.html` in the application working
directory. The prompt asks for one standalone semantic HTML file with embedded
CSS and JavaScript, a human-review caveat, and an accessible question filter.
The application confirms an update only when the exact output is a new or content-changed,
nonempty regular file. Missing, unchanged, directory, or symbolic-link output is not a verified
write. Review the HTML source before opening it; file checks do not evaluate JavaScript or accessibility.

Prompt guidance and structural validation are not authorization or grounding
boundaries. Generated claims still require human review or a separate evaluator.

## Manual check

1. Run with each built-in fact set and confirm the selected facts print before
   generation.
2. Confirm the exhibit has one title, a 100-140-word narrative, and three
   visitor questions.
3. Inspect the validation summary and grounding disclaimer.
4. Decline research and check that any tool activity is limited to `approved_fact_lookup`.
5. Opt into research and check the separate unverified source list; manually verify any links.
6. Opt into `exhibit.html` and check the application's artifact-verification result before reviewing the page.

This is the application a learner ends up with after the museum lessons, not a separate reference
architecture. The entrypoint keeps one small session runner that starts the client, creates the
session, enforces the timeout, rejects blank output, and cleans up on every path; the research,
generation, and optional HTML steps reuse it with different session configurations. Follow the
track from
[`workshop/museum-00-preflight.md`](https://github.com/jamesmontemagno/copilot-sdk-workshop/blob/main/workshop/museum-00-preflight.md).
