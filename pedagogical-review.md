# Copilot SDK Workshop: Pedagogical Review and Redesign Specification

**Reviewed:** July 21, 2026  
**Repository:** `codemillmatt/copilot-sdk-workshop`

## Executive conclusion

The workshop needs a structural redesign. Its executable code is generally current, but the learning experience is presently a code assembly guide rather than a self-guided workshop.

A learner may paste enough code to run the samples, but the material does not adequately prepare them to explain:

- What the GitHub Copilot SDK is.
- What an agent session represents.
- Why streaming exists.
- What tool calling means.
- Why an application would expose a local tool.
- How MCP differs from a local tool.
- Where permissions and trust boundaries apply.
- When to choose each capability in another application.

The revised workshop must teach those concepts before asking learners to implement them.

## Learner contract

The redesign should assume:

- Professional C# and .NET experience.
- Familiarity with prompts and chat.
- No prior understanding of agents, tool calling, permissions, or MCP.
- A self-guided learner without an instructor.

The learner should finish able to **explain the architecture and build a small application containing a Copilot session, streaming, a local tool, scoped permissions, and an MCP server**.

The application must remain concrete throughout:

> A .NET console application accepts a webpage URL, uses Playwright to inspect the page, consults an application-owned WCAG catalog, and produces an accessibility report.

The advertised duration should remain reasonably close to 90 minutes, but exact timing is secondary to achieving the learning outcome.

---

# Review of the current learning sequence

| Current step | Pedagogical problem |
|---|---|
| **Overview** | It never defines the Copilot SDK or clearly describes the finished application. It lists implementation tasks rather than establishing purpose and architecture. |
| **Setup** | It blurs the homepage, prework, and timed workshop. It verifies building but provides little self-guided troubleshooting. |
| **Client and Model Selection** | It starts immediately with code. “Owns the runtime connection” is not enough explanation of the runtime, client, or session. Model selection delays the learner’s first meaningful success. |
| **Session and Streaming** | It introduces events and `TaskCompletionSource` without first explaining what streaming means, why it benefits an application, or how the event lifecycle works. |
| **Local Tool Calling** | It does not adequately define tool calling, explain why model knowledge is insufficient, or clarify what the application owns. Its function returns generic guidance rather than querying the starter catalog. |
| **Interactive Assistant** | It asks learners to derive a substantial implementation from a completed sample. This breaks the small-step progression and adds nonessential work. |
| **Browser Setup** | It interrupts the conceptual sequence with prerequisites that should have been completed during preflight. |
| **MCP Session** | It supplies configuration code but does not adequately teach ownership, process boundaries, reuse, trust, permissions, or when MCP should be chosen over a local tool. |
| **URL Input** | It abruptly transforms the interactive assistant into a different application without showing the complete cumulative state. |
| **Tool Activity** | It repeats previously added event cases rather than introducing a meaningful new concept. |
| **Report Prompt** | It teaches a prompt recipe but not how to constrain, validate, or interpret agent output. |
| **Generate Tests** | It prints speculative test code without saving, compiling, or running it. This is not a completed learning loop. |
| **Run and Review** | It recaps implementation steps instead of testing conceptual understanding. Its local-fix exercise cannot affect the deployed target URL. |

## Central instructional failure

Most current pages follow this pattern:

> Short instruction → code block → completion checklist

Every substantive lesson instead needs to follow:

> **Meaning → benefit → role in this application → small change → observable result → practical decision**

For example, the local-tool lesson should explain the concept before showing `CopilotTool.DefineTool`:

> A local tool is a C# function that Copilot can choose to call while answering a request. It runs inside your application, so your code owns the data, validation, execution, and returned result.
>
> Local tools are useful when Copilot needs authoritative application-specific information or deterministic behavior that should not come from general model knowledge. In this application, the tool queries a small WCAG catalog and returns an exact criterion and remediation.

## Additional current-site problems

- The homepage does not explain the Copilot SDK.
- The finished application is not described concretely.
- Phrases such as “one hands-on build,” “continuous build,” and “local tool-calling accessibility assistant” use implementation or marketing language without giving learners a useful mental model.
- The homepage contains too many equally weighted cards.
- Prerequisite cards make the workshop appear to begin on the landing page.
- Published links to the starter, samples, and source return 404.
- The README’s direct `file://` quick start cannot fetch the Markdown lessons.
- Checkpoint boxes appear interactive but are disabled.
- Code blocks do not expose the Copy controls for which CSS already exists.
- The mobile menu lacks Escape and proper focus management.

---

# Proposed curriculum

## Preflight — Before the workshop

Use a distinct, untimed page containing:

- Install .NET, Node.js, Copilot CLI, and a supported browser.
- Authenticate Copilot CLI.
- Clone the repository.
- Build the starter.
- Run version-verification commands.
- Show expected output.
- Provide OS-specific commands through tabs.
- Include likely authentication, CLI-path, package, and browser problems in a troubleshooting panel.

The homepage must not contain these instructions.

## Core Step 1 — Create your first Copilot session

**Concepts:** SDK, agent runtime, client, session.

Explain:

- The SDK is the .NET API used by the application.
- The Copilot runtime performs agent work.
- `CopilotClient` manages the runtime connection.
- A session holds one continuing agent conversation.

The learner should make the smallest possible edit and receive a complete response using `SendAndWaitAsync`.

**Expected run result:** A first successful Copilot response during the opening lesson.

**Practical concept check:** Which object should be reused across conversations, and which object contains one conversation’s context?

## Core Step 2 — Stream a response

**Concepts:** streaming, session events, completion.

Explain:

- Streaming does not change the answer; it changes when the application receives it.
- Progressive output improves perceived responsiveness.
- Delta events contain incremental content.
- The final message contains the completed content.
- `SessionIdleEvent` tells the application processing has ended.

Add streaming in one small edit.

**Expected run result:** Visible response chunks followed by completion.

**Practical concept check:** When would `SendAndWaitAsync` be preferable to streaming?

## Core Step 3 — Add application-owned knowledge

**Concepts:** tool calling and local tools.

The starter should already contain the WCAG catalog. Learners should expose its lookup method as an SDK tool rather than implementing domain data.

Explain these benefits:

- Authoritative application data.
- Deterministic and testable C# behavior.
- No need to include the full catalog in every prompt.
- The model may choose when to request the tool, but the application controls execution.

**Expected run result:** Terminal activity shows Copilot invoking the lookup tool and returning a specific WCAG criterion.

**Practical concept check:** Would calculating an order total be a local tool or an MCP server, and why?

## Core Step 4 — Connect an external tool safely

**Concepts:** MCP, process boundary, reuse, permissions, trust.

Introduce or update the architecture diagram:

```text
Console application
  └─ Copilot SDK session
      ├─ Local WCAG tool — same process, application owned
      └─ Playwright MCP — separate process, externally implemented
            └─ Browser
```

Explain:

- MCP is a protocol for connecting reusable external capabilities.
- Playwright is not compiled into the application’s domain code.
- External tools cross a trust boundary.
- Permissions determine which requested actions may execute.

Provide a small, prebuilt scoped permission handler. Learners configure it rather than writing permission infrastructure.

**Expected run result:** Playwright opens the controlled workshop target and reads its title.

**Practical concept check:** Why use Playwright through MCP rather than implementing browser automation as a local C# callback?

## Core Step 5 — Combine local and MCP tools

**Concepts:** agent orchestration and tool selection.

The learner supplies the target URL. The session can choose between:

- Playwright MCP for evidence from the live page.
- The local WCAG catalog for authoritative remediation guidance.

Show tool names in activity output so learners can observe which capability is used.

**Expected run result:** The console shows browser inspection followed by WCAG lookup activity.

**Practical concept check:** Which tool should discover an unlabeled input, and which should explain the associated WCAG criterion?

## Core Step 6 — Produce a structured report

Teach why output constraints matter.

Use a concise report format:

- Finding and page evidence.
- WCAG criterion.
- Recommended remediation.

Avoid unnecessary statistics, emoji severity systems, and broad claims of WCAG compliance.

**Expected run result:** A short report containing several known target-page findings.

**Practical concept check:** Which parts of the report are direct browser evidence, and which parts are model interpretation?

## Core Step 7 — Run and explain the completed application

Run the finished application from beginning to end.

Revisit the architecture diagram and ask:

- What state belongs to the session?
- Why is the WCAG catalog local?
- Why is Playwright external?
- Where are permissions enforced?
- What would change if another MCP server were added?

These are open self-checks rather than graded assessments.

## Optional extensions

1. **Choose a model** — introduce model enumeration and switching after the core architecture is understood.
2. **Generate a Playwright test** — retain only if the extension creates a file, references the required dependencies, and runs the generated test.

---

# Required lesson-page structure

Every substantive lesson should visibly contain:

1. **Outcome** — “After this step, the application will…”
2. **What this means** — a plain-language definition.
3. **Why it matters** — the practical benefit.
4. **Where it fits** — the architecture diagram with the current addition highlighted.
5. **Make the change** — file path, exact insertion point, small code block, and Copy button.
6. **Run it** — command and short expected transcript.
7. **Check your understanding** — one practical decision question.

Use progressive disclosure for secondary content:

- **Tabs:** Windows/macOS/Linux commands or genuine code variants.
- **Collapsed panels:** complete checkpoint file, troubleshooting, and deeper explanation.
- **Always visible:** the primary conceptual and implementation sequence.

Do not hide the main lesson inside tabs or accordions.

## Code-presentation requirements

For each edit:

- Show the file path.
- State whether the learner is inserting, replacing, or deleting code.
- Show only the changed block by default.
- Provide a working Copy button.
- Place the complete checkpoint file in a collapsed panel.
- Maintain a complete, compiling checkpoint after every major stage.

## Run-checkpoint requirements

Every required step should include:

- The exact run command.
- A short expected transcript.
- Two or three likely failure modes and their fixes.
- A clear “You are ready to continue when…” statement.

---

# Website redesign specification

## Homepage purpose

The homepage is orientation, not workshop content. It should fit within roughly one desktop viewport and contain:

- A plain-language Copilot SDK definition.
- The exact application being built.
- A compact flow:

```text
URL → Playwright inspection → C# WCAG lookup → accessibility report
```

- A short sample transcript.
- An audience statement.
- Four or five concrete learning outcomes.
- One primary **Start workshop** button.

Remove:

- Prerequisite cards.
- The separate “Build the Application” card.
- Resource cards.
- Duplicate feature boxes.
- “One hands-on build” and “continuous build” marketing language.

The friendly neon styling and playful tone can remain.

## Suggested homepage copy

### Build an AI-powered accessibility reviewer with .NET

The GitHub Copilot SDK lets your .NET application run Copilot as an agent: send prompts, stream responses, expose C# functions as tools, and connect external capabilities through MCP.

In this workshop, you will build a console application that accepts a webpage URL, opens it with Playwright, identifies accessibility problems, consults your application’s WCAG catalog, and produces a structured report.

```text
URL: https://example.com

Inspecting page with Playwright…
Looking up WCAG 3.3.2 in the application catalog…

Finding: The name input has no programmatic label.
WCAG: 3.3.2 Labels or Instructions
Fix: Associate a visible <label> with the input.
```

Primary action: **Start workshop**

## Lesson navigation

Keep visible:

- `Step 3 of 7`
- A short current-step title.
- Previous and Next controls.
- Optional extensions separated from the core path.

A large permanent sidebar is unnecessary. A compact progress indicator or menu is sufficient.

## Visual-density rules

- Use one primary content surface per page.
- Limit concept introductions to two or three concise paragraphs plus a diagram or callout.
- Do not place every paragraph or item in its own card.
- Collapse full source code by default.
- Collapse troubleshooting and deeper details by default.
- Keep expected output short and visually distinct.
- Use diagrams to reduce prose.
- Keep the mobile header compact.

## Technical site requirements

- Working Copy buttons.
- Keyboard-accessible tabs and disclosure controls.
- Escape and focus management for menus.
- `aria-current` for the active step.
- Page titles that include the current lesson.
- No disabled task-list checkboxes that appear interactive.
- Repository source links must resolve to GitHub rather than undeployed GitHub Pages paths.

---

# Release criteria

The redesign should not be considered ready until:

- Every unfamiliar term is defined before its first code use.
- Every required step explains meaning, benefit, and application role.
- Every step ends with a runnable state and expected transcript.
- Every major checkpoint has a complete compiling reference file.
- No lesson requires learners to reverse-engineer a future sample.
- Local tools and MCP are compared explicitly across ownership, process, trust, and use case.
- The permission example is scoped rather than universally approving actions.
- The local tool queries the prebuilt application-owned WCAG catalog without requiring learners to implement domain complexity.
- All published links pass automated checks.
- The site works on desktop and mobile with keyboard-accessible interactions.
- A silent usability test with several professional .NET developers confirms they can proceed without instructor clarification.
- Those learners can explain—not merely run—the final architecture.
