# Instructor notes: streaming

Learner page: [Stream the curator](../../workshop/museum-02-stream-the-curator.md)
Deck: leave it closed. This is a continuation of the first response.

## Teach two responsibilities, not one switch

The session setting requests streaming. The Copilot CLI runtime sends events through the SDK, and a consumer must decide what to do with them.
This workshop supplies that consumer as an ordinary application helper, not another agent.

A delta is a new piece of text, not necessarily a word. The helper prints deltas and retains the text for the later validator. If a complete assistant message arrives without deltas, it uses that message as a fallback.

The final message and session idle are different events. A conversation can contain tool work and more than one assistant message before it becomes idle. Do not describe the first completed message as proof that all work is finished.

## What the supplied helper owns

It subscribes, sends, handles response and tool events, applies a deadline, and releases its subscription. The language implementations use different native mechanisms:

- .NET uses event subscriptions and cancellation-aware waits.
- Node.js resolves or rejects its waiting promise and clears the timer.
- Python bounds sending and completion with an asynchronous timeout.
- Go observes events while waiting with a timed context.
- Rust coordinates the send, event stream, and deadline.
- Java consumes events while the SDK's bounded completion wait handles the request.

Use these distinctions only when participants ask about their language. Do not turn this lesson into six lectures about asynchronous programming.

## Check the mechanism honestly

A short response may appear almost instantly. That is not evidence that streaming is off. Output buffering and a final-message fallback can also make the display appear as one block. Check both the setting and the event consumer.

The helper's timeout bounds the response operation, not every possible phase of starting the application. Cleanup must still run after failure. Unsubscribing means the application stops listening; it does not by itself prove that external work was cancelled successfully.

## A useful desk-side question

Ask: "Why retain the full response if we already printed it?" A good answer connects streaming to Step 6: the validator needs the generated text, not a screenshot of the terminal.

If text prints twice, inspect how final-message fallback is gated and reset. If the program never finishes, distinguish no idle event from a missing subscription or an unresolved permission request. Keep the documented deadline and error reporting.

Further reading: [streaming events](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/features/streaming-events.md) and [usage events](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/features/usage-and-billing.md).
