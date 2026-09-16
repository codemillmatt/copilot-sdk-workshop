# Instructor notes: curator voice

Learner page: [Give the curator a voice](../../workshop/museum-03-curator-voice.md)
Deck: no group interruption is needed unless several participants confuse guidance and enforcement.

## Why this change comes before facts

The educator needs a visitor-facing voice before the application produces a longer exhibit. This step changes the system message while retaining the prompt, response path, and empty tool list. That makes the comparison easier to interpret.

The system message supplies durable role and behavior instructions for the session. The prompt supplies the current task. "Write for a broad public audience" belongs in the former; "write two sentences about Apollo 11" is the latter.

Replace mode fits the non-coding task. It replaces the Copilot CLI's default system prompt, including contextual and safety guidance within that prompt.
It does not remove the separate permission callback or tool allowlist.
A system message configures the agent's role, but is not an agent by itself.
Avoid saying either that a custom prompt is a security boundary or that replacing it disables every Copilot CLI runtime control.

## The three modes

| Mode | Explain it as | Important qualification |
|---|---|---|
| `append` | Extend the default prompt. | Appropriate when the existing coding role still fits. |
| `replace` | Supply the complete system message. | The application must state its intended scope explicitly. |
| `customize` | Override selected prompt sections. | Review the supported sections for the pinned SDK before using it elsewhere. |

Participants do not need to memorize all three. They need to explain why this application chooses replacement.

## Evaluate a behavior, not a preferred sentence

Ask participants to compare audience, preface, and requested length. The earlier response may already have used an appropriate voice. A lack of dramatic change is not a failed exercise.

If someone asks for the system message and the model refuses, that shows one observed response. It does not prove the instruction is secret or that an authorization boundary rejected the request. The model can redirect, refuse, or answer.

The application has still supplied no approved historical evidence. Better prose does not establish grounding. Step 4 adds source instructions and the matching fact tool together, rather than instructing the model to call a tool it cannot access.

## Optional instructor experiment

Use the same request with two instruction variants and collect several outputs during rehearsal. Compare a stated criterion, such as whether a chat-style preface appears. Keep the original instructions and restore them before continuing. Do not make participants rerun until they reproduce your preferred example.

Further reading: [system-message configuration](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/getting-started.md) and [SDK compatibility](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/troubleshooting/compatibility.md).
