# Adversarial Critique of `pedagogical-review.md`

**Critiqued:** July 21, 2026
**Repository:** `codemillmatt/copilot-sdk-workshop`
**Subject:** `pedagogical-review.md` (the workshop redesign specification)
**Purpose:** Red-team the review itself so the redesign it drives is factually sound.

## Methodology

Unlike a desk critique, every claim below was checked against the running repository:

- Built both reference samples with the local Copilot CLI on the path
  (`dotnet build samples/accessibility-report`, `samples/hello-copilot-sdk`) — **both succeed, 0 warnings/0 errors**.
- Reflected over `GitHub.Copilot.SDK.dll` 1.0.7 (net10.0) to confirm the real public API surface.
- Probed the live GitHub Pages site over HTTP to confirm which links actually 404.
- Read all 13 lesson files, the starter, both samples, the site HTML/CSS/JS, and `deploy.yml`.

Concrete receipts are collected in the [Evidence appendix](#evidence-appendix).

## Verdict

The review is **directionally strong and unusually well-grounded** — the large majority of its specific
diagnoses are true and reproducible. It should be trusted as the basis for the redesign **after** the corrections
below.

However, three problems must be fixed in the review before it drives implementation:

1. Its **central thesis is under-verified and slightly misleading.** The review reassures the reader that
   "executable code is generally current" and locates the entire problem in pedagogy. In fact the verified,
   highest-impact defects are that **the build-along artifact does not stay compiling from lesson to lesson**
   and that **lesson 04 throws away the starter's real data**. That is a *code/authoring* failure as much as a
   pedagogical one, and the reassurance is unearned because the review did not compile anything.
2. It **mis-states two concrete facts** an implementer will act on (the starter "lookup method" and the
   "scoped permission handler").
3. It contains **internal inconsistencies** (advertised duration, deployment owner) that it never reconciles.

---

## A. Diagnoses that are verified correct — keep these

These claims reproduce exactly. They are the review's strongest asset; lead with them so readers trust the rest.

| Review claim | Status | Evidence |
|---|---|---|
| Local-tool function returns generic guidance instead of querying the catalog | **True** | `04-local-tools.md` *replaces* `AccessibilityRuleCatalog.cs` (which holds real `Rules`) with a stub returning a hardcoded string. |
| Tool Activity (09) repeats previously added event cases | **True** | The two `ToolExecutionStartEvent`/`ToolExecutionCompleteEvent` blocks in 04 and 09 are identical. |
| Interactive Assistant (05) makes learners reverse-engineer a sample | **True** | 05 supplies only the session factory and says "use the completed shape from `samples/hello-copilot-sdk`" for the loop. |
| Generate Tests (11) never saves, compiles, or runs the output | **True** | 11 streams the generated test to the console only. |
| Run & Review (12) local fix cannot affect the deployed target | **True** | 12 analyzes the deployed URL while the "fix one issue" edit is to local `src/BlazorApp`. |
| Published starter/samples/source links 404 | **True** | `deploy.yml` copies only `docs/` + `workshop/`; `…/start/HelloCopilotSDK/` returns **404** live. |
| Copy controls have CSS but are not exposed | **True** | `.copy-code-btn` exists (`step.css:447`); `step.html` never injects a copy button. |
| Checkpoint boxes appear interactive but are disabled | **True** | `marked` renders task lists as `disabled` inputs; `step.css` styles `:checked` states, so they look live. |
| Mobile menu lacks Escape and focus management | **True** | `toggleFlyout()` toggles classes/`aria-expanded` only — no key handler, no focus trap. |
| README `file://` quick start cannot fetch the markdown | **True** | `step.html` uses `fetch()`, which browsers block under `file://`. |
| Homepage uses marketing/implementation language | **True** | "one hands-on build," "Continuous Build," "local tool-calling accessibility assistant" appear verbatim in `index.html`. |

## B. Claims that are wrong or imprecise — fix in the review

### B1. "Its executable code is generally current" — under-verified, and it undersells real defects
Both samples do compile (verified). But that sentence functions as a reassurance that the code is fine and only
the teaching is thin. The verified defects tell a different story: the **as-you-build artifact breaks** (missing
loop in 05, whole-file replacement in 08) and **04 discards the starter's authoritative data**. Reframe the thesis
to: *"the material is both an assembly guide rather than a workshop, AND the assembly itself does not remain
compiling or use the data it ships."* This matters because it changes the top redesign priority (see D2).

### B2. Starter catalog is mis-described
The review says learners should "expose **its lookup method**." The starter's `AccessibilityRuleCatalog.cs`
contains only a `Rules` **data array** and an `AccessibilityRule` record — **there is no lookup method.** An
implementer following this literally will look for a method that does not exist. Correct to: *"add a lookup over
the starter's `Rules` array and expose that as the tool."*

### B3. The "scoped permission handler" is not an SDK feature — say so
Reflection confirms `GitHub.Copilot.PermissionHandler` exposes **only `ApproveAll`**. There is no built-in scoped
or deny helper. The review's "provide a small, prebuilt scoped permission handler" and the release criterion "the
permission example is scoped" are achievable only by **hand-writing an `OnPermissionRequest` delegate** that
inspects the request and approves/denies per action. State this explicitly so the author budgets for it.

Additionally, the review **overlooks that the local tool sets `SkipPermission = true`.** That is not a bug to hide —
it is the *cleanest possible illustration* of the exact trust boundary the review wants to teach: the app-owned
C# tool is trusted (permission skipped), the external MCP process is not (permission gated). The redesign should
**use** this contrast rather than ignore it.

### B4. Step 9 is not "meaningless" — it is misplaced
The review says 09 introduces no "meaningful new concept." In fact 09 states the workshop's single most important
payoff: *"your application observes a C# function and an MCP browser tool in exactly the same way."* The real
defect is that it adds **no new code** and sits in the wrong place. Reframe as "fold this concept into the MCP
step," not "delete it."

### B5. WCAG mapping in the suggested copy is imprecise
The review's recommended homepage transcript maps an input with "no programmatic label" to
"3.3.2 Labels or Instructions." That is defensible but loose — a *programmatic* label maps more precisely to
1.3.1 Info and Relationships or 4.1.2 Name, Role, Value. Since the review itself demands that "every unfamiliar
term is defined" and warns against "broad claims of WCAG compliance," its own exemplar should be airtight and
consistent with whatever the rebuilt catalog returns.

## C. Internal inconsistencies to reconcile

### C1. Timing math does not close
The current lesson budgets sum to **~125 minutes** (10+15+15+15+10+10+10+5+5+10+10+10), yet the site and overview
advertise **~90 minutes**. The review keeps "~90" *and* mandates a heavier seven-part structure for every
substantive lesson — which pushes time **up**, not down. The review should acknowledge the 125-vs-90 gap and pick
a lever: raise the advertised number, or lean harder on its own "model selection → optional extension" cut.

### C2. Deployment owner — the root cause behind the 404s
The review is authored for `codemillmatt/copilot-sdk-workshop`, but every internal URL hardcodes
`jamesmontemagno.github.io`. Verified live: **`codemillmatt.github.io/copilot-sdk-workshop/` returns 404**, while
**`jamesmontemagno.github.io/copilot-sdk-workshop/` is 200 and serving the target app.** So this repository's own
Pages site is dark and the workshop silently depends on another owner's deployment. The review's link/404 finding
should name this root cause and force a decision on the canonical owner — otherwise "fix the links" is incomplete.

## D. Structural risks the review under-weighs

### D1. The rigid seven-part lesson template risks bloat
Mandating Outcome / Meaning / Why / Where / Change / Run / Check for *every* substantive lesson invites repetition
(e.g., redrawing the architecture diagram on every page) and works against the review's own "one primary content
surface" and "use diagrams to reduce prose" goals. Recommend the template as **guidance**, and show the
architecture diagram cumulatively with only the current delta highlighted.

### D2. The most valuable requirement is buried
The strongest, most actionable rule in the entire document — "every major checkpoint has a complete compiling
reference file" plus "no lesson requires reverse-engineering a future sample" — is stranded in the Release
criteria. **Promote it into the required lesson structure:** *every step ends with a full, compiling `Program.cs`
in a collapsed panel.* That single change fixes 04, 05, and 08 at once and directly addresses the verified
"artifact stops compiling" defect from B1.

### D3. "First success" nuance
"Model selection delays the learner's first meaningful success" slightly ignores that `PingAsync` already gives an
early success in lesson 02. The review's proposed `SendAndWaitAsync`-first Step 1 is genuinely better and the API
exists (verified) — but keep the ping as the connection check rather than implying there is no early signal today.

---

## Evidence appendix

```text
# Both reference samples compile
$ dotnet build samples/accessibility-report   -> Build succeeded. 0 Warning(s) 0 Error(s)
$ dotnet build samples/hello-copilot-sdk      -> Build succeeded. 0 Warning(s) 0 Error(s)

# SDK 1.0.7 public API (reflection over GitHub.Copilot.SDK.dll, net10.0)
CopilotSession.SendAndWaitAsync(String prompt, ...)      # review's Step 1 API is valid
CopilotSession.SendAndWaitAsync(MessageOptions, ...)
GitHub.Copilot.PermissionHandler -> prop: Func ApproveAll  # ONLY member; no scoped helper ships

# Live GitHub Pages probe
200  https://jamesmontemagno.github.io/copilot-sdk-workshop/
200  https://jamesmontemagno.github.io/copilot-sdk-workshop/target-app/
404  https://jamesmontemagno.github.io/copilot-sdk-workshop/start/HelloCopilotSDK/
404  https://codemillmatt.github.io/copilot-sdk-workshop/

# Deploy scope (.github/workflows/deploy.yml) copies only:
docs/*  ->  _site/          workshop/*  ->  _site/workshop/
# start/, samples/, src/ are never deployed -> in-lesson ../start, ../samples, ../src links 404

# Duration budgets from lesson headers
01:10 02:15 03:15 04:15 05:10 06:10 07:10 08:5 09:5 10:10 11:10 12:10  = ~125 min  (advertised ~90)
```

---

## E. Concrete edit punch-list for `pedagogical-review.md`

1. Rewrite the executive conclusion so the thesis is *both* "not a workshop" *and* "the build-along artifact does
   not stay compiling / ignores its own data." Drop or qualify "executable code is generally current."
2. Change "expose its lookup method" → "add a lookup over the starter's `Rules` array and expose that."
3. Rewrite Core Step 4 permissions: state that only `ApproveAll` ships; show a hand-written scoped
   `OnPermissionRequest` delegate; explicitly contrast it with the local tool's `SkipPermission = true` as the
   trust-boundary illustration.
4. Reframe the Step 9 note as "merge this concept into the MCP step," not "it introduces nothing meaningful."
5. Add one sentence reconciling the ~125-minute reality with the ~90-minute claim.
6. Add a site-problem item: this repo's own Pages site 404s and the content depends on another owner's
   deployment; decide the canonical owner and de-hardcode the URLs.
7. Tighten the WCAG example (programmatic label → 1.3.1 / 4.1.2) and keep it consistent with the rebuilt catalog.
8. Promote "complete compiling reference file at every checkpoint" from Release criteria into the required lesson
   structure.
9. Soften the seven-part template from mandate to guidance; specify a single cumulative architecture diagram.
10. Keep `PingAsync` as the connection check while adopting the `SendAndWaitAsync`-first Step 1.
