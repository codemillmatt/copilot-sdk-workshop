# Teach Museum Exhibit Studio

This is the instructor companion to the museum workshop. Learners use the shorter [workshop pages](../../workshop/museum-00-preflight.md). You use these notes to prepare the explanation, demonstrations, and recovery decisions behind each step.

This directory is a shadow curriculum, not another application. Teach from the same `start-museum/<language>` project and use `finished/<language>/museum-exhibit-studio` as a separate reference. Do not give learners a second set of implementation instructions.

## The teaching goal

Participants build a console application that turns educator-approved facts into an exhibit draft. They should leave able to explain the Copilot CLI harness, use an SDK session, add a local tool, and distinguish a model choice from an application-enforced rule.

The museum scenario matters because the agent's job is not software development. The educator chooses evidence and reviews claims. The agent drafts language. Code controls available capabilities and checks selected requirements. Keep those responsibilities visible throughout the session.

## Use precise names

Call the configured museum worker the **curator agent**. It combines a model, task instructions, conversation context, and permitted tools.
Its tool list can be empty. Adding a tool extends its capabilities rather than creating another agent.
Call the execution engine the **Copilot CLI runtime** or **Copilot CLI harness**, not just "Copilot."
The **GitHub Copilot SDK** is the programming interface your application uses.

Models, SDK clients, sessions, tools, and MCP servers are components, not complete agents by themselves.
Do not count each new session or external process as an additional agent.
The application configures separate drafting, research, and HTML-writing roles and sequences their work.
Use [the component table](01-first-session.md) when participants ask where the agent lives.

## Use the deck sparingly

Download [the eight-slide instructor deck](../../docs/instructor/museum-instructor.pptx). It includes speaker notes. Its source is in this directory's `slides` folder.

In the browser companion, the language selector changes links into the learner workshop. The instructor notes cover all languages and default those links to Node.js.

Show slides 1-3 at the opening. Then leave the deck and let learners work. Return only at the transitions below. The timings are facilitation suggestions, not measured workshop durations.

| Moment | Slides | Suggested teaching time | Release learners to |
|---|---|---|---|
| Opening | 1-3 | 3-4 minutes | Steps 1-3: first response, streaming, and curator voice |
| First tool | 4 | 60-90 seconds | Step 4: selected facts and tool registration |
| Results and controls | 5 | 60-90 seconds | Steps 5-6: lifecycle and structural checks |
| External research | 6 | 60-90 seconds | Step 7: a separate Wikipedia session |
| Optional file output | 7 | About 60 seconds | Step 8, only if the group has time |
| Close | 8 | 30-60 seconds | One participant explanation or demonstration |

Aim for roughly 8-10 minutes of planned group instruction across the workshop, not a continuous lecture. Add time for genuine questions. Preflight belongs before the live session. Learners still have enough explanation to work independently if they miss a spoken cue.

Do not interrupt every chapter. Pause when the group is about to encounter a new boundary: local tools, code-based checks, external tools, and file writes.

## Prepare before the session

1. Choose one demonstration language. The learner track supports all six, but switching the projected code between languages slows the room.
2. Complete the selected language's preflight on the machine you will project. Verify account access, the pinned packages, and research's separate Node.js dependency.
3. Run the intended demonstration yourself with public sample facts. This is a live, potentially billable rehearsal, not part of the deterministic repository checks.
4. Keep a working reference, a clean starter, and any rehearsal transcript separate. Never restore a learner's whole repository.
5. Open the local or published learner site and test the selected language links, browser zoom, and projector readability.
6. Prepare a clearly labeled saved transcript in case network or account access fails. Do not present it as a live run.

Read [the preflight notes](00-preflight.md) for the environment checklist and safe recovery procedure.

## Chapter notes

| Learner chapter | Instructor preparation | Main misconception to catch |
|---|---|---|
| Preflight | [Purpose, tools, and accounts](00-preflight.md) | The starter's application helpers are not automatic SDK features. |
| 1 | [Client, session, and harness](01-first-session.md) | The SDK client is not the model. |
| 2 | [Streaming and completion](02-streaming.md) | Enabling streaming is not the same as consuming events. |
| 3 | [System messages](03-curator-voice.md) | A requested behavior is not an authorization rule. |
| 4 | [Facts and local tools](04-approved-facts.md) | Tool availability does not prove invocation or factual accuracy. |
| 5 | [Lifecycle and failure](05-guardrails.md) | A response timeout is not proof that all work stopped successfully. |
| 6 | [Structural checks](06-structure.md) | Passing format checks does not verify claims. |
| 7 | [Separate research](07-research.md) | A tool allowlist is not an operating-system sandbox. |
| 8 | [Local HTML output](08-exhibit-page.md) | A model saying "created" is not evidence of a changed file. |

## Facilitate through evidence

Ask for the first missing observable result, not a screenshot of the entire error log. Did the starter build? Did the session return? Did the tool complete? Did the validator inspect the returned text? Did the file change?

For model-driven behavior, accept useful variation. A model can omit a tool call, refuse an adversarial request without attempting it, or finish before a short timeout. Those observations need interpretation, not instructions to keep retrying until the transcript matches the page.

For deterministic behavior, use fixed inputs and direct code results. Keep that distinction explicit when participants say they "tested the agent."

## Maintenance contract

Learner Markdown remains the source of executable steps. These notes explain it rather than reproduce full code listings. Update the paired instructor chapter and slide notes when a learner step changes its purpose or boundary.

The code examples use the repository's pinned SDK baseline. The deck's diagram describes the local Copilot CLI-backed architecture taught here, not every supported SDK hosting mode. Review official documentation before changing that architecture or the pins.

Source references:

- [Copilot CLI agent loop](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/features/agent-loop.md)
- [SDK setup and runtime options](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/README.md)
- [Copilot CLI installation and access](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli)
