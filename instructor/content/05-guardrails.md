# Instructor notes: lifecycle and controls

Learner page: [Set the guardrails](../../workshop/museum-05-guardrails.md)
Deck: slide 5 before Steps 5-6. Treat these as one transition from requesting behavior to checking outcomes.

## Keep the categories separate

Permissions answer whether an action may proceed. Tool filtering determines which capabilities are available. Timeouts bound waits. Output validation checks a returned result. All matter, but they are not interchangeable forms of authorization.

The sample's generation session keeps exactly `approved_fact_lookup`. The Copilot CLI harness exposes that capability to the model, not file, shell, or browser tools.
It still needs network access to the model service. "No network tool" is not "offline application."

The generation callback rejects unexpected permission requests. Its allowed local fact tool skips permission. Research and HTML use separate, narrowly scoped callbacks when those capabilities arrive.

## What the runner owns

The runner receives session settings, a prompt, and a timeout. It acquires the client and session, requests a response, rejects blank output, and performs cleanup on failure as well as success.

This sample creates a client for each run to make ownership local and visible. That is not a requirement to create a new client for every conversation in a service. A longer-lived application can reuse a client while creating separate sessions.

The normal generation deadline is 120 seconds. Distinguish this response deadline from a whole-application startup budget. If cleanup also fails, preserve evidence of the primary failure rather than printing a success-shaped fallback.

## Demonstrating failure without misleading the room

A short timeout can expire, but a fast response can still finish first. Do not promise that one second always fails. During preparation, inspect how the helper receives and applies the timeout in your demonstration language.

The instruction-shaped fact in the learner page is an observation exercise. It asks for browser and file actions that generation does not expose. The model may refuse, repeat the text, or write misleading prose. It may not request any forbidden action at all.

The important conclusion is limited: the capability policy remains narrow. Do not describe the experiment as proof that prompt injection is solved. Generated prose can still be manipulated.

For a deterministic permission check, invoke the supplied handler with a fixed out-of-scope request in a separate rehearsal test. Do not add a broad approval flag or a permanent failure switch to the learner application.

## A question worth asking aloud

"If the model returns a convincing paragraph, which of our checks proves it is accurate?" None at this point. Even the next structural validator proves only its stated format and vocabulary rules. Use this to introduce Step 6 without another slide.

Further reading: [session lifecycle hooks](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/hooks/session-lifecycle.md) and [session limits](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/features/session-limits.md).
