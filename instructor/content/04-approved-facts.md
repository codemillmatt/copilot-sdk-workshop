# Instructor notes: facts and the first tool

Learner page: [Ground it in approved facts](../../workshop/museum-04-approved-facts.md)
Deck: slide 4, immediately before the first local tool. Keep the explanation to 60-90 seconds.

## The important transition

Until now, the application sent requests for text. It now exposes a function the model may request. Explain the whole round trip once:

1. The application selects and retains the approved fact list.
2. The Copilot CLI harness describes the tool to the model.
3. The model can request the tool by name.
4. The Copilot CLI harness invokes the application function.
5. The result joins the conversation for a subsequent model response.

The model receives a tool description and argument schema, not the function's source code. Execution and data ownership stay in the application.
The local function is not a second agent. It executes a specific capability within the curator agent's workflow.

## Registration, availability, and choice

The tool list registers the implementation. The explicit allowlist exposes its name to this session. The prompt requests that the model call it. These are three different responsibilities.

The tool has no arguments. That prevents the model from requesting a different fact set through a free-text query. The tool factory retains the educator's selected list and applies the supplied size checks before generation.

Do not claim that a zero-argument tool is universally better. It fits this exercise because the educator already selected the complete evidence set. A larger catalog might need a validated query and retrieval policy.

## Why not put the facts in the prompt?

That is a reasonable design for a small list. The tool here teaches application-owned data access and makes invocation visible in the event stream. It does not make the data intrinsically more trustworthy, reduce every request's token use, or guarantee that the model follows it.

The fact tool is deterministic for a given approved list. The model's choice to call it and its subsequent prose are not. A completed tool event proves neither complete use of the facts nor the absence of unsupported claims.

## Controls participants should recognize

The helper removes surrounding whitespace, discards blank facts, rejects an empty list or more than 20 facts, and rejects a fact longer than 500 characters. The limits apply before a generation request.

The permission-free setting is deliberate for this public, read-only, application-owned list. "Read-only" is not equivalent to "safe to disclose." A similar function returning confidential records would require a different access and data-handling design.

## Release and observe

Send participants to the code after asking: "Which line makes the tool available, and which merely asks for its use?" Look for fact selection, registration, the one-name allowlist, and a requested/completed tool event.

When they change fact sets, the request builder remains unchanged. That contrast demonstrates ownership. If the tool was not called, record that observation rather than accepting a plausible draft as evidence of retrieval.

For an input failure, an empty custom list is deterministic and requires no adversarial prompt. Keep the literal error visible. The next lesson gives failures a consistent reporting path.

Further reading: [tools in the SDK](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/getting-started.md#how-tools-work).
