# Instructor notes: separate Wikipedia research

Learner page: [Research with Wikipedia MCP](../../workshop/museum-07-wikipedia-research.md)
Deck: slide 6 before Step 7. Explain the new process boundary in 60-90 seconds.

## Why introduce another session?

The educator may want background notes, but a retrieved article is not an approved exhibit fact. Research therefore uses a separate conversation with its own instructions and tool list. Its output is shown to the educator and never passed into generation.

The diagram has two branches to show data separation, not parallel execution. The application runs optional research first, then generation. Both receive the approved facts as subject context, but only generation has the local fact tool.

If the educator wants a researched detail in an exhibit, they must review it and add it to a fact list on a later run. The application does not have an automatic approval pipeline.

## MCP and the process boundary

Model Context Protocol lets the Copilot CLI harness connect to tools offered by another program, using the SDK's session configuration.
The Wikipedia MCP server runs in a separate Node.js process and accesses the web.
It is a tool server, not an agent. The configured research role still uses a model to request its tools.

The new SDK session supplies separate conversation context for that research role. A session object alone is not an agent.
The application sequences research and drafting explicitly. There is no autonomous handoff between the two sessions.

The server configuration exposes `search` and `readArticle`. The session uses the prefixed names `wikipedia-search` and `wikipedia-readArticle`. The permission handler also checks the server and tool identifiers.

Those controls limit model-requested capabilities. They do not sandbox the server's operating-system access. Treat the package as software you choose to trust, keep its pin, and use public sample data.

## Permission decisions for instructor preparation

The learner needs `approve-once` and `reject`. The SDK also exposes `user-not-available`, which denies when no person can decide, and `no-result`, which leaves resolution to another connected consumer.

Wider scopes can remember approvals for a session, location, or longer. This example does not use them. Do not broaden a policy simply because the first external-tool request fails.

A permission callback is not the same API as a pre-tool-use hook. Review the actual pinned request type in the demonstration language, including missing or malformed fields.

## Explain the limits of the notes and sources

The article text is untrusted input. It may contain instructions or misleading claims. The research prompt asks the model to treat it as data, while the tool profile prevents file and shell actions. The prose can still be wrong.

The source parser extracts model-reported titles and URLs from a final `## Sources` section. It does not prove that a URL exists, belongs to Wikipedia, was consulted, or supports a claim. Preserve the explicit unverified heading and the notice when no usable citations are present.

Do not rename these links "verified citations" in your spoken explanation or slide narration.

## Rehearse an isolated failure

Declining research should follow the previous generation path. For a controlled failure, use a temporary error inside the research-only error-handling region before its session call. Leave generation networking available. Restore the original source afterward.

Disconnecting all networking is the wrong demonstration: generation also needs the model service. A failed optional enrichment should not be confused with offline operation.

If the first MCP run fails, distinguish package download, server startup, tool-name configuration, permission rejection, and the actual research request. Use a labeled recorded transcript if the room cannot reach the service.

Further reading: [MCP configuration](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/features/mcp.md) and [MCP troubleshooting](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/troubleshooting/mcp-debugging.md).
