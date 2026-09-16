# Instructor notes: the first session

Learner page: [Your first curator session](../../workshop/museum-01-first-curator-session.md)
Deck: slides 2-3 at the opening. Do not repeat the opening as another lecture here.

## The explanation behind the diagram

The client is the application's SDK connection to the Copilot CLI runtime. The session object lets the application address one conversation. The Copilot CLI runtime manages that conversation's messages and tool results. The model service generates responses from the supplied context.

The Copilot CLI has a human-facing terminal interface, but this application uses its runtime programmatically through the GitHub Copilot SDK. Participants do not automate typing into the Copilot CLI's chat interface.

**Harness** describes the machinery around model calls: conversation state, tool coordination, events, and execution controls.
Here that machinery is the Copilot CLI runtime. The model does not run application code, and the SDK is not a replacement model.

## What is the agent, and what is not?

In this workshop, an **agent** is a model-driven worker configured for a task with instructions, conversation context, and permitted tools.
The curator is that configured worker. It is a behavior assembled from components, not an extra process or one SDK object.
Tools are optional. The first lesson runs a configured response-only worker, then later lessons add capabilities.

| Term | What it means here | Why it is not interchangeable with "agent" |
|---|---|---|
| Model | Generates text and requests tools. | By itself, it lacks this application's task configuration and execution machinery. |
| GitHub Copilot SDK | The programmatic API. | It gives the application access to the Copilot CLI harness. |
| SDK client | The connection and its lifecycle. | Creating a connection does not define the worker's task. |
| SDK session | One conversation and its configuration. | A conversation container alone is not the configured worker. |
| Copilot CLI harness | Runs the model-and-tool loop. | It is the execution engine, not the museum-specific role definition. |
| Local tool or MCP server | Implements callable capabilities. | A function or server does not become an agent merely because the model can call it. |

This distinction describes the workshop architecture. Do not claim that the Copilot CLI product never provides an agent experience:
its interactive coding-agent experience is a separate way to use the same product.
Here, the application configures the curator and uses the Copilot CLI as its harness.

A user request can involve multiple model calls. The SDK's assistant-turn events describe iterations within that work. An idle session means the current request's processing finished; it does not mean the session can never receive another message.

## Why the initial tool list is explicitly empty

No custom tools registered is not the same as no tools available. The initial examples use an explicit empty allowlist and reject unexpected permission requests. This gives the first experiment a clear purpose: request text, without exposing tools.

The rejection callback is an authorization response, not authentication to the model service. If an SDK permission request has no consumer, it can remain pending. An answer that happens to require no permission does not prove a handler-less configuration is appropriate.

Keep the language-specific empty-list syntax. In particular, Go's empty slice and Rust's `Some(vec![])` are intentional; a missing value can serialize differently.

## What to observe

The first response should appear and the process should finish. It is only a connection and request/response check. No educator-approved fact list has entered the conversation, so relevant Apollo 11 prose is not yet verified exhibit content.

If the result is empty, fails, or stalls, locate the boundary before changing code: client startup, session creation, send, completion, or cleanup. Use the error and the selected language's documented setup. Do not widen the tool policy to diagnose a model-only request.

## Questions to keep ready

| Participant question | Response |
|---|---|
| Is the client the agent? | No. It provides access to the Copilot CLI harness. The configured model, instructions, context, and tools define the curator's work. |
| Is each session another agent? | Not automatically. The session is a conversation. Explain the configured task and capabilities instead of counting session objects. |
| Do I need a new model for every session? | No. Separate conversations can use the same model. Session separation is about context and configuration. |
| Why create another client in the later runner? | This sample makes ownership local to one run. A longer-lived application can reuse a client across independent sessions. |
| Does `clientName` name the conversation? | No. It labels the application. Do not treat it as a session identifier. |

Use the existing client/session diagram for a participant who confuses these objects. Point to the process boundaries instead of adding another layer of terminology.

Further reading: [the pinned SDK agent loop](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/features/agent-loop.md) and [session persistence](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/features/session-persistence.md).
