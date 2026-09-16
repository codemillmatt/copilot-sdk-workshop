# Step 2: Stream a response

> **Pace:** Self-paced

## What you'll see

You'll configure a streaming-enabled session and consume its events so text and completion become
visible. Every language prints response chunks while the session works and keeps a completed-message
fallback for a message that arrives without deltas.

## How streaming changes the experience

[**Streaming**](https://github.com/github/copilot-sdk/blob/main/docs/features/streaming-events.md)
does not change the answer. It changes when an application that subscribes to the event stream
receives it. Instead of waiting for one completed message, the session emits events throughout the
turn:

- Assistant message delta events contain each new piece of response text.
- The completed assistant message event contains the full message.
- A session idle event means the current request's processing and tool work have finished.
- A session error event reports a failed turn.

## Why progressive output feels better

Seeing text arrive makes the application feel more responsive. Later, the same event stream will
show activity from local and MCP tools.

The session flow is now `response deltas -> final message -> idle`.

:::language dotnet
## Stream the response in C#

### 1. Add the streaming helper

Open and inspect the supplied `Helpers/ResponseStreamer.cs`:

<!-- code-id: 02-streaming-dotnet-1 -->
```csharp
using GitHub.Copilot;

namespace HelloCopilotSDK.Helpers;

public static class ResponseStreamer
{
    public static async Task SendAndPrintAsync(
        CopilotSession session,
        string prompt,
        TimeSpan? timeout = null,
        CancellationToken cancellationToken = default)
    {
        var actualTimeout = timeout ?? TimeSpan.FromSeconds(120);
        if (actualTimeout <= TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(timeout), "The response timeout must be positive.");
        }
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(actualTimeout);
        var completed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var receivedDelta = false;

        using var subscription = session.On<SessionEvent>(sessionEvent =>
        {
            if (completed.Task.IsCompleted)
            {
                return;
            }
            switch (sessionEvent)
            {
                case AssistantMessageDeltaEvent delta when !string.IsNullOrEmpty(delta.Data.DeltaContent):
                    receivedDelta = true;
                    Console.Write(delta.Data.DeltaContent);
                    break;
                case AssistantMessageEvent message:
                    if (!receivedDelta)
                    {
                        Console.Write(message.Data.Content);
                    }
                    receivedDelta = false;
                    break;
                case ToolExecutionStartEvent tool:
                    Console.WriteLine($"\n[tool:start] {tool.Data.ToolName}");
                    break;
                case ToolExecutionCompleteEvent tool:
                    Console.WriteLine($"[tool:done] success={tool.Data.Success}");
                    break;
                case SessionIdleEvent:
                    Console.WriteLine();
                    completed.TrySetResult();
                    break;
                case SessionErrorEvent error:
                    completed.TrySetException(new InvalidOperationException(error.Data.Message));
                    break;
            }
        });

        try
        {
            var send = session.SendAsync(new MessageOptions { Prompt = prompt }, deadline.Token);
            var first = await Task.WhenAny(send, completed.Task).WaitAsync(deadline.Token);
            await first;
            await send.WaitAsync(deadline.Token);
            await completed.Task.WaitAsync(deadline.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException("The response reached the timeout.");
        }
        finally
        {
            await deadline.CancelAsync();
        }
    }
}
```

The final-message case handles a runtime that completes without sending deltas. An error completes
the task with an exception instead of looking like a successful turn.

### 2. Use the helper

In `Program.cs`, add `using HelloCopilotSDK.Helpers;`, then replace the session and
response code with:

<!-- code-id: 02-streaming-dotnet-2 -->
```csharp
await using var session = await client.CreateSessionAsync(new SessionConfig
{
    AvailableTools = [],
    OnPermissionRequest = (_, _) => Task.FromResult(
        PermissionDecision.Reject("This session does not allow unexpected permission requests.")),
    Streaming = true
});

Console.WriteLine("\nCopilot:");
await ResponseStreamer.SendAndPrintAsync(
    session,
    "Explain accessible names in three short bullet points.");
```

## Run it

```bash
dotnet run
```

The bullets should start appearing progressively before the process exits:

<!-- code-id: 02-streaming-dotnet-3 -->
```text
Connected to the Copilot runtime: ...

Copilot:
- Gives a control a programmatic identity.
- Helps screen-reader users understand its purpose.
- Connects visible labels to form controls.
```

<details>
<summary>Troubleshooting this run</summary>

| Symptom | Fix |
|---|---|
| Text appears only at the end | Confirm `Streaming = true` is in this session's `SessionConfig`. |
| The application exits before text appears | Confirm the helper awaits `completed.Task` after `SendAsync`. |
| Text is printed twice | Keep the delta check and reset in the `AssistantMessageEvent` branch. |

</details>

> **You're ready to add tools when:** the configured response path prints an answer and completes
> the turn without hiding session errors.

<details>
<summary>Complete Step 2 implementation</summary>

Compare your work with this complete Step 2 implementation.

`Helpers/ResponseStreamer.cs`:

<!-- code-id: 02-streaming-dotnet-4 -->
```csharp
using GitHub.Copilot;

namespace HelloCopilotSDK.Helpers;

public static class ResponseStreamer
{
    public static async Task SendAndPrintAsync(
        CopilotSession session,
        string prompt,
        TimeSpan? timeout = null,
        CancellationToken cancellationToken = default)
    {
        var actualTimeout = timeout ?? TimeSpan.FromSeconds(120);
        if (actualTimeout <= TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(timeout), "The response timeout must be positive.");
        }
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(actualTimeout);
        var completed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var receivedDelta = false;

        using var subscription = session.On<SessionEvent>(sessionEvent =>
        {
            if (completed.Task.IsCompleted)
            {
                return;
            }
            switch (sessionEvent)
            {
                case AssistantMessageDeltaEvent delta when !string.IsNullOrEmpty(delta.Data.DeltaContent):
                    receivedDelta = true;
                    Console.Write(delta.Data.DeltaContent);
                    break;
                case AssistantMessageEvent message:
                    if (!receivedDelta)
                    {
                        Console.Write(message.Data.Content);
                    }
                    receivedDelta = false;
                    break;
                case ToolExecutionStartEvent tool:
                    Console.WriteLine($"\n[tool:start] {tool.Data.ToolName}");
                    break;
                case ToolExecutionCompleteEvent tool:
                    Console.WriteLine($"[tool:done] success={tool.Data.Success}");
                    break;
                case SessionIdleEvent:
                    Console.WriteLine();
                    completed.TrySetResult();
                    break;
                case SessionErrorEvent error:
                    completed.TrySetException(new InvalidOperationException(error.Data.Message));
                    break;
            }
        });

        try
        {
            var send = session.SendAsync(new MessageOptions { Prompt = prompt }, deadline.Token);
            var first = await Task.WhenAny(send, completed.Task).WaitAsync(deadline.Token);
            await first;
            await send.WaitAsync(deadline.Token);
            await completed.Task.WaitAsync(deadline.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException("The response reached the timeout.");
        }
        finally
        {
            await deadline.CancelAsync();
        }
    }
}
```

`Program.cs`:

<!-- code-id: 02-streaming-dotnet-5 -->
```csharp
using System;
using System.Threading.Tasks;
using GitHub.Copilot;
using GitHub.Copilot.Rpc;
using HelloCopilotSDK.Helpers;

#pragma warning disable GHCP001 // Custom permission decisions are evaluation-only in SDK 1.0.11.

Console.WriteLine("=== Streaming from Copilot ===\n");

await using var client = new CopilotClient();
await client.StartAsync();

var ping = await client.PingAsync("workshop");
Console.WriteLine($"Connected to the Copilot runtime: {ping.Message}\n");

await using var session = await client.CreateSessionAsync(new SessionConfig
{
    AvailableTools = [],
    OnPermissionRequest = (_, _) => Task.FromResult(
        PermissionDecision.Reject("This session does not allow unexpected permission requests.")),
    Streaming = true
});

Console.WriteLine("Copilot:");
await ResponseStreamer.SendAndPrintAsync(
    session,
    "Explain accessible names in three short bullet points.");

#pragma warning restore GHCP001
```

</details>
:::

:::language nodejs
## Stream the response in TypeScript

### 1. Inspect the streaming helper

Open `src/workshop.ts`. The starter already exports `streamResponse`, which subscribes
with `session.on`, prints assistant deltas, keeps a final-message fallback, rejects session errors,
and resolves on idle:

<!-- code-id: 02-streaming-nodejs-1 -->
```typescript
export async function streamResponse(session: CopilotSession, prompt: string, timeout = 120_000): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let receivedDelta = false;
    let settled = false;
    let unsubscribe = () => {};
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => finish(new Error("Response timeout.")), timeout);
    unsubscribe = session.on((event) => {
      if (event.type === "assistant.message_delta" && event.data.deltaContent) { receivedDelta = true; process.stdout.write(event.data.deltaContent); }
      else if (event.type === "assistant.message") {
        if (!receivedDelta) process.stdout.write(event.data.content);
        receivedDelta = false;
      }
      else if (event.type === "tool.execution_start") console.log(`\n[tool:start] ${event.data.toolName}`);
      else if (event.type === "tool.execution_complete") console.log(`[tool:done] success=${event.data.success}`);
      else if (event.type === "session.error") finish(new Error(event.data.message));
      else if (event.type === "session.idle") { console.log(); finish(); }
    });
    void session.send({ prompt }).catch(finish);
  });
}
```

The tool start and completion branches stay quiet in this step and become useful once you register
tools later.

### 2. Wire the helper into the entrypoint

Replace `src/index.ts` with:

<!-- code-id: 02-streaming-nodejs-2 -->
```typescript
import { CopilotClient } from "@github/copilot-sdk";
import { streamResponse } from "./workshop.js";

const client = new CopilotClient();
try {
  await client.start();
  const session = await client.createSession({ availableTools: [], onPermissionRequest: () => ({ kind: "reject", feedback: "This session does not allow that permission request." }), streaming: true });
  try {
    await streamResponse(
      session,
      "Describe why streaming improves an interactive assistant in one sentence.",
    );
  } finally {
    await session.disconnect();
  }
} finally {
  await client.stop();
}
```

## Run it

```bash
npm start
```

The one-sentence response should start appearing progressively through the event callback:

<!-- code-id: 02-streaming-nodejs-3 -->
```text
Streaming shows partial answers as soon as tokens arrive, so the assistant feels responsive while it works.
```

<details>
<summary>Troubleshooting this run</summary>

| Symptom | Fix |
|---|---|
| Text appears only at the end | Confirm `streaming: true` is passed to `createSession`. |
| The process exits before text appears | Confirm `streamResponse` waits for `session.idle` before resolving. |
| Text is printed twice | Keep the `!receivedDelta` guard on the `assistant.message` branch. |
| Cannot find module `./workshop.js` | Import the helper as `./workshop.js` even though the source file is `workshop.ts`. |

</details>

> **You're ready to add tools when:** the configured response path prints an answer and completes
> the turn without hiding session errors.

<details>
<summary>Complete Step 2 implementation</summary>

Compare your work with this complete Step 2 implementation.

`src/workshop.ts` (`streamResponse`):

<!-- code-id: 02-streaming-nodejs-4 -->
```typescript
export async function streamResponse(session: CopilotSession, prompt: string, timeout = 120_000): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let receivedDelta = false;
    let settled = false;
    let unsubscribe = () => {};
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => finish(new Error("Response timeout.")), timeout);
    unsubscribe = session.on((event) => {
      if (event.type === "assistant.message_delta" && event.data.deltaContent) { receivedDelta = true; process.stdout.write(event.data.deltaContent); }
      else if (event.type === "assistant.message") {
        if (!receivedDelta) process.stdout.write(event.data.content);
        receivedDelta = false;
      }
      else if (event.type === "tool.execution_start") console.log(`\n[tool:start] ${event.data.toolName}`);
      else if (event.type === "tool.execution_complete") console.log(`[tool:done] success=${event.data.success}`);
      else if (event.type === "session.error") finish(new Error(event.data.message));
      else if (event.type === "session.idle") { console.log(); finish(); }
    });
    void session.send({ prompt }).catch(finish);
  });
}
```

`src/index.ts`:

<!-- code-id: 02-streaming-nodejs-5 -->
```typescript
import { CopilotClient } from "@github/copilot-sdk";
import { streamResponse } from "./workshop.js";

const client = new CopilotClient();
try {
  await client.start();
  const session = await client.createSession({ availableTools: [], onPermissionRequest: () => ({ kind: "reject", feedback: "This session does not allow that permission request." }), streaming: true });
  try {
    await streamResponse(
      session,
      "Describe why streaming improves an interactive assistant in one sentence.",
    );
  } finally {
    await session.disconnect();
  }
} finally {
  await client.stop();
}
```

</details>
:::

:::language python
## Stream the response in Python

### 1. Subscribe to session events

Replace `main.py` with an async entrypoint that enables streaming, handles
`AssistantMessageDeltaData`, keeps an `AssistantMessageData` fallback, surfaces
`SessionErrorData`, and waits for `SessionIdleData`:

<!-- code-id: 02-streaming-python-1 -->
```python
import asyncio

from copilot import CopilotClient
from copilot.rpc import PermissionDecisionReject
from copilot.session_events import (
    AssistantMessageData,
    AssistantMessageDeltaData,
    SessionErrorData,
    SessionIdleData,
)


async def main() -> None:
    async with CopilotClient() as client:
        async with await client.create_session(available_tools=[], on_permission_request=lambda _request, _invocation: PermissionDecisionReject(feedback="This session does not allow that permission request."), streaming=True) as session:
            done = asyncio.Event()
            error: RuntimeError | None = None
            received_delta = False

            def on_event(event) -> None:
                nonlocal error, received_delta
                match event.data:
                    case AssistantMessageDeltaData(delta_content=delta) if delta:
                        received_delta = True
                        print(delta, end="", flush=True)
                    case AssistantMessageData(content=content):
                        if content and not received_delta:
                            print(content)
                        received_delta = False
                    case SessionErrorData(message=message):
                        error = RuntimeError(message)
                        done.set()
                    case SessionIdleData():
                        done.set()

            unsubscribe = session.on(on_event)
            try:
                async with asyncio.timeout(120):
                    await session.send(
                        "Explain accessible names in three short bullet points."
                    )
                    await done.wait()
            finally:
                unsubscribe()
            if error is not None:
                raise error


if __name__ == "__main__":
    asyncio.run(main())
```

The final-message case handles a runtime that completes without deltas. A session error sets
`error` and completes the wait so the turn does not look successful.

## Run it

```bash
python main.py
```

The bullets should start appearing progressively through the event callback:

<!-- code-id: 02-streaming-python-2 -->
```text
- Gives a control a programmatic identity.
- Helps screen-reader users understand its purpose.
- Connects visible labels to form controls.
```

<details>
<summary>Troubleshooting this run</summary>

| Symptom | Fix |
|---|---|
| Text appears only at the end | Confirm `streaming=True` is passed to `create_session`. |
| The process exits before text appears | Confirm you `await done.wait()` after `session.send`. |
| Text is printed twice | Keep the `not received_delta` guard on `AssistantMessageData`. |
| Import errors for session events | Import the event types from `copilot.session_events`. |

</details>

> **You're ready to add tools when:** the configured response path prints an answer and completes
> the turn without hiding session errors.

<details>
<summary>Complete Step 2 implementation</summary>

Compare your work with this complete Step 2 implementation.

`main.py`:

<!-- code-id: 02-streaming-python-3 -->
```python
import asyncio

from copilot import CopilotClient
from copilot.rpc import PermissionDecisionReject
from copilot.session_events import AssistantMessageData, AssistantMessageDeltaData, SessionErrorData, SessionIdleData


async def main() -> None:
    async with CopilotClient() as client:
        async with await client.create_session(available_tools=[], on_permission_request=lambda _request, _invocation: PermissionDecisionReject(feedback="This session does not allow that permission request."), streaming=True) as session:
            done = asyncio.Event()
            error: RuntimeError | None = None
            received_delta = False

            def on_event(event) -> None:
                nonlocal error, received_delta
                match event.data:
                    case AssistantMessageDeltaData(delta_content=delta) if delta:
                        received_delta = True
                        print(delta, end="", flush=True)
                    case AssistantMessageData(content=content):
                        if content and not received_delta:
                            print(content)
                        received_delta = False
                    case SessionErrorData(message=message):
                        error = RuntimeError(message)
                        done.set()
                    case SessionIdleData():
                        done.set()

            unsubscribe = session.on(on_event)
            try:
                async with asyncio.timeout(120):
                    await session.send("Explain accessible names in three short bullet points.")
                    await done.wait()
            finally:
                unsubscribe()
            if error is not None:
                raise error


if __name__ == "__main__":
    asyncio.run(main())
```

</details>
:::

:::language go
## Stream the response in Go

### 1. Add the streaming helper

In `main.go`, replace the package contents with a `streamResponse` helper that
subscribes with `session.On`, prints `AssistantMessageDeltaData`, keeps an `AssistantMessageData`
fallback after `SendAndWait`, and returns send errors:

<!-- code-id: 02-streaming-go-1 -->
```go
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync/atomic"

	copilot "github.com/github/copilot-sdk/go"
	"github.com/github/copilot-sdk/go/rpc"
)

func streamResponse(session *copilot.Session, prompt string) error {
	var receivedDelta atomic.Bool
	unsubscribe := session.On(func(event copilot.SessionEvent) {
		if delta, ok := event.Data.(*copilot.AssistantMessageDeltaData); ok && delta.DeltaContent != "" {
			receivedDelta.Store(true)
			fmt.Print(delta.DeltaContent)
		}
	})
	defer unsubscribe()

	response, err := session.SendAndWait(context.Background(), copilot.MessageOptions{Prompt: prompt})
	if err != nil {
		return err
	}
	if !receivedDelta.Load() && response != nil {
		if message, ok := response.Data.(*copilot.AssistantMessageData); ok {
			fmt.Print(message.Content)
		}
	}
	fmt.Println()
	return nil
}
```

### 2. Create a streaming session and call the helper

Add `main` below the helper:

<!-- code-id: 02-streaming-go-2 -->
```go
func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() (err error) {
	client := copilot.NewClient(&copilot.ClientOptions{LogLevel: "error"})
	defer func() { err = errors.Join(err, client.Stop()) }()
	if err := client.Start(context.Background()); err != nil {
		return err
	}

	session, err := client.CreateSession(context.Background(), &copilot.SessionConfig{
		OnPermissionRequest: func(_ copilot.PermissionRequest, _ copilot.PermissionInvocation) (rpc.PermissionDecision, error) {
			return &rpc.PermissionDecisionReject{}, nil
		},
		AvailableTools: []string{},
		Streaming:      copilot.Bool(true),
	})
	if err != nil {
		return err
	}
	defer func() { err = errors.Join(err, session.Disconnect()) }()

	if err := streamResponse(session, "Explain accessible names in three short bullet points."); err != nil {
		return err
	}
	return nil
}
```

## Run it

```bash
go run .
```

The bullets should start appearing progressively through the event callback:

<!-- code-id: 02-streaming-go-3 -->
```text
- Gives a control a programmatic identity.
- Helps screen-reader users understand its purpose.
- Connects visible labels to form controls.
```

<details>
<summary>Troubleshooting this run</summary>

| Symptom | Fix |
|---|---|
| Text appears only at the end | Confirm `Streaming: copilot.Bool(true)` is set on `SessionConfig`. |
| The process exits without output | Confirm `streamResponse` uses `SendAndWait` and returns its error. |
| Text is printed twice | Keep the `!receivedDelta` guard before printing `AssistantMessageData`. |
| Import path errors | Use `copilot "github.com/github/copilot-sdk/go"`. |

</details>

> **You're ready to add tools when:** the configured response path prints an answer and completes
> the turn without hiding session errors.

<details>
<summary>Complete Step 2 implementation</summary>

Compare your work with this complete Step 2 implementation.

`main.go`:

<!-- code-id: 02-streaming-go-4 -->
```go
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync/atomic"

	copilot "github.com/github/copilot-sdk/go"
	"github.com/github/copilot-sdk/go/rpc"
)

func streamResponse(session *copilot.Session, prompt string) error {
	var receivedDelta atomic.Bool
	unsubscribe := session.On(func(event copilot.SessionEvent) {
		if delta, ok := event.Data.(*copilot.AssistantMessageDeltaData); ok && delta.DeltaContent != "" {
			receivedDelta.Store(true)
			fmt.Print(delta.DeltaContent)
		}
	})
	defer unsubscribe()

	response, err := session.SendAndWait(context.Background(), copilot.MessageOptions{Prompt: prompt})
	if err != nil {
		return err
	}
	if !receivedDelta.Load() && response != nil {
		if message, ok := response.Data.(*copilot.AssistantMessageData); ok {
			fmt.Print(message.Content)
		}
	}
	fmt.Println()
	return nil
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() (err error) {
	client := copilot.NewClient(&copilot.ClientOptions{LogLevel: "error"})
	defer func() { err = errors.Join(err, client.Stop()) }()
	if err := client.Start(context.Background()); err != nil {
		return err
	}

	session, err := client.CreateSession(context.Background(), &copilot.SessionConfig{
		OnPermissionRequest: func(_ copilot.PermissionRequest, _ copilot.PermissionInvocation) (rpc.PermissionDecision, error) {
			return &rpc.PermissionDecisionReject{}, nil
		},
		AvailableTools: []string{},
		Streaming:      copilot.Bool(true),
	})
	if err != nil {
		return err
	}
	defer func() { err = errors.Join(err, session.Disconnect()) }()

	if err := streamResponse(session, "Explain accessible names in three short bullet points."); err != nil {
		return err
	}
	return nil
}
```

</details>
:::

:::language rust
## Stream the response in Rust

### 1. Add the streaming helper macro

Replace `src/main.rs` with a `stream_response!` macro that calls
`session.subscribe()`, prints assistant deltas with `tokio::select!`, keeps a final-message
fallback, and waits until both send completion and `session.idle` have happened:

<!-- code-id: 02-streaming-rust-1 -->
```rust
use std::io::{self, Write};

use github_copilot_sdk::permission;
use github_copilot_sdk::types::SessionConfig;
use github_copilot_sdk::{Client, ClientOptions};

macro_rules! stream_response {
    ($session:expr, $prompt:expr) => {{
        let mut events = $session.subscribe();
        let send = $session.send($prompt);
        tokio::pin!(send);
        let mut sent = false;
        let mut idle = false;
        let mut received_delta = false;

        while !sent || !idle {
            tokio::select! {
                result = &mut send, if !sent => {
                    result?;
                    sent = true;
                }
                event = events.recv() => {
                    let event = event?;
                    match event.event_type.as_str() {
                        "assistant.message_delta" => {
                            if let Some(delta) = event.data.get("deltaContent").and_then(|value| value.as_str()) {
                                received_delta = true;
                                print!("{delta}");
                                io::stdout().flush()?;
                            }
                        }
                        "assistant.message" if !received_delta => {
                            if let Some(content) = event.data.get("content").and_then(|value| value.as_str()) {
                                print!("{content}");
                                io::stdout().flush()?;
                            }
                        }
                        "session.error" => {
                            let message = event.data.get("message").and_then(|value| value.as_str())
                                .unwrap_or("Copilot session failed");
                            return Err(std::io::Error::other(message.to_owned()).into());
                        }
                        "session.idle" => idle = true,
                        _ => {}
                    }
                }
            }
        }
        println!();
    }};
}
```

### 2. Create a streaming session and invoke the macro

Add the async entrypoint below the macro:

<!-- code-id: 02-streaming-rust-2 -->
```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut config = SessionConfig::default().with_permission_handler(permission::deny_all());
    config.available_tools = Some(vec![]);
    config.streaming = Some(true);

    let client = Client::start(ClientOptions::default()).await?;
    let result = async {
        let session = client.create_session(config).await?;
        let response_result = tokio::time::timeout(std::time::Duration::from_secs(120), async {
            stream_response!(
                session,
                "Explain accessible names in three short bullet points.".to_owned()
            );
            Ok::<(), Box<dyn std::error::Error>>(())
        })
        .await
        .map_err(|_| {
            std::io::Error::new(std::io::ErrorKind::TimedOut, "timeout waiting for response")
        })
        .map_err(|error| Box::new(error) as Box<dyn std::error::Error>)
        .and_then(|result| result);
        let cleanup = session.disconnect().await;
        if let Err(error) = cleanup {
            if response_result.is_ok() {
                return Err(Box::new(error) as Box<dyn std::error::Error>);
            }
            eprintln!("Session cleanup also failed: {error}");
        }
        response_result
    }
    .await;
    let cleanup = client.stop().await;
    if let Err(error) = cleanup {
        if result.is_ok() {
            return Err(Box::new(error) as Box<dyn std::error::Error>);
        }
        eprintln!("Client cleanup also failed: {error}");
    }
    result
}
```

## Run it

```bash
cargo run
```

The bullets should start appearing progressively through the event subscription:

<!-- code-id: 02-streaming-rust-3 -->
```text
- Gives a control a programmatic identity.
- Helps screen-reader users understand its purpose.
- Connects visible labels to form controls.
```

<details>
<summary>Troubleshooting this run</summary>

| Symptom | Fix |
|---|---|
| Text appears only at the end | Confirm `config.streaming = Some(true)` before `create_session`. |
| The process exits before text appears | Keep the `while !sent \|\| !idle` loop and wait for `session.idle`. |
| Text is printed twice | Keep the `if !received_delta` guard on `"assistant.message"`. |
| Output looks buffered | Flush stdout after each `print!` of delta content. |

</details>

> **You're ready to add tools when:** the configured response path prints an answer and completes
> the turn without hiding session errors.

<details>
<summary>Complete Step 2 implementation</summary>

Compare your work with this complete Step 2 implementation.

`src/main.rs`:

<!-- code-id: 02-streaming-rust-4 -->
```rust
use std::io::{self, Write};

use github_copilot_sdk::permission;
use github_copilot_sdk::types::SessionConfig;
use github_copilot_sdk::{Client, ClientOptions};

macro_rules! stream_response {
    ($session:expr, $prompt:expr) => {{
        let mut events = $session.subscribe();
        let send = $session.send($prompt);
        tokio::pin!(send);
        let mut sent = false;
        let mut idle = false;
        let mut received_delta = false;

        while !sent || !idle {
            tokio::select! {
                result = &mut send, if !sent => {
                    result?;
                    sent = true;
                }
                event = events.recv() => {
                    let event = event?;
                    match event.event_type.as_str() {
                        "assistant.message_delta" => {
                            if let Some(delta) = event.data.get("deltaContent").and_then(|value| value.as_str()) {
                                received_delta = true;
                                print!("{delta}");
                                io::stdout().flush()?;
                            }
                        }
                        "assistant.message" if !received_delta => {
                            if let Some(content) = event.data.get("content").and_then(|value| value.as_str()) {
                                print!("{content}");
                                io::stdout().flush()?;
                            }
                        }
                        "session.error" => {
                            let message = event.data.get("message").and_then(|value| value.as_str())
                                .unwrap_or("Copilot session failed");
                            return Err(std::io::Error::other(message.to_owned()).into());
                        }
                        "session.idle" => idle = true,
                        _ => {}
                    }
                }
            }
        }
        println!();
    }};
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut config = SessionConfig::default().with_permission_handler(permission::deny_all());
    config.available_tools = Some(vec![]);
    config.streaming = Some(true);

    let client = Client::start(ClientOptions::default()).await?;
    let result = async {
        let session = client.create_session(config).await?;
        let response_result = tokio::time::timeout(std::time::Duration::from_secs(120), async {
            stream_response!(
                session,
                "Explain accessible names in three short bullet points.".to_owned()
            );
            Ok::<(), Box<dyn std::error::Error>>(())
        })
        .await
        .map_err(|_| {
            std::io::Error::new(std::io::ErrorKind::TimedOut, "timeout waiting for response")
        })
        .map_err(|error| Box::new(error) as Box<dyn std::error::Error>)
        .and_then(|result| result);
        let cleanup = session.disconnect().await;
        if let Err(error) = cleanup {
            if response_result.is_ok() {
                return Err(Box::new(error) as Box<dyn std::error::Error>);
            }
            eprintln!("Session cleanup also failed: {error}");
        }
        response_result
    }
    .await;
    let cleanup = client.stop().await;
    if let Err(error) = cleanup {
        if result.is_ok() {
            return Err(Box::new(error) as Box<dyn std::error::Error>);
        }
        eprintln!("Client cleanup also failed: {error}");
    }
    result
}
```

</details>
:::

:::language java
## Stream the response in Java

### 1. Enable streaming on the session

Open the supplied `src/main/java/workshop/ResponseStreamer.java`. It subscribes to
assistant and tool events, prints progressive text, and uses the SDK's bounded completion wait.
Then replace `src/main/java/workshop/AccessibilityReport.java` with:

<!-- code-id: 02-streaming-java-1 -->
```java
package workshop;

import com.github.copilot.CopilotClient;
import com.github.copilot.rpc.SessionConfig;
import com.github.copilot.rpc.PermissionRequestResult;
import java.util.List;
import java.util.concurrent.CompletableFuture;

public final class AccessibilityReport {
    private AccessibilityReport() {
    }

    public static void main(String[] args) throws Exception {
        try (var client = new CopilotClient()) {
            client.start().get();
            var config = new SessionConfig()
                    .setAvailableTools(List.of())
                    .setOnPermissionRequest((request, ignored) -> CompletableFuture.completedFuture(
                        PermissionRequestResult.reject("This session does not allow unexpected permission requests.")))
                    .setStreaming(true);
            try (var session = client.createSession(config).get()) {
                ResponseStreamer.sendAndPrint(session,
                        "Explain accessible names in three short bullet points.");
            }
        }
    }
}
```

`setStreaming(true)` enables events; `ResponseStreamer.sendAndPrint` consumes them.
Its SDK wait handles completion, errors, and timeout. The helper releases its subscription and
cancels an unfinished wait on exit, so the flag alone is not the streaming implementation.

## Run it

```bash
mvn compile exec:java
```

Response chunks should print as they arrive, followed by completion:

<!-- code-id: 02-streaming-java-2 -->
```text
- Gives a control a programmatic identity.
- Helps screen-reader users understand its purpose.
- Connects visible labels to form controls.
```

<details>
<summary>Troubleshooting this run</summary>

| Symptom | Fix |
|---|---|
| No response is printed | Confirm `setStreaming(true)` and the call to `ResponseStreamer.sendAndPrint`. |
| The request fails or times out | Keep the helper's bounded wait and native resource scopes; do not catch and ignore its error. |
| Maven cannot find the main class | Run from the starter directory with `mvn compile exec:java`. |

</details>

> **You're ready to add tools when:** the configured response path prints an answer and completes
> the turn without hiding session errors.

<details>
<summary>Complete Step 2 implementation</summary>

Compare your work with this complete Step 2 implementation.

`src/main/java/workshop/AccessibilityReport.java`:

<!-- code-id: 02-streaming-java-3 -->
```java
package workshop;

import com.github.copilot.CopilotClient;
import com.github.copilot.rpc.SessionConfig;
import com.github.copilot.rpc.PermissionRequestResult;
import java.util.List;
import java.util.concurrent.CompletableFuture;

public final class AccessibilityReport {
    private AccessibilityReport() {
    }

    public static void main(String[] args) throws Exception {
        try (var client = new CopilotClient()) {
            client.start().get();
            var config = new SessionConfig()
                    .setAvailableTools(List.of())
                    .setOnPermissionRequest((request, ignored) -> CompletableFuture.completedFuture(
                        PermissionRequestResult.reject("This session does not allow unexpected permission requests.")))
                    .setStreaming(true);
            try (var session = client.createSession(config).get()) {
                ResponseStreamer.sendAndPrint(session,
                        "Explain accessible names in three short bullet points.");
            }
        }
    }
}
```

</details>
:::

## Check your understanding

When would a completed-response send be a better choice than event streaming?

<details>
<summary>Check your answer</summary>

Use a completed-response send for background work or simple request/response code that does not
need progressive output or intermediate events.

</details>

## Learn more

- [Steering and queueing](https://github.com/github/copilot-sdk/blob/main/docs/features/steering-and-queueing.md):
  sending another message while a turn is still running, either to redirect it or to queue work.
- [Session limits](https://github.com/github/copilot-sdk/blob/main/docs/features/session-limits.md):
  putting an AI Credits budget on a session before it starts producing tokens.
- [Usage and billing metrics](https://github.com/github/copilot-sdk/blob/main/docs/features/usage-and-billing.md):
  reading token counts, context-window use, and cost from the same event stream.

Continue to [Step 3: Add application-owned knowledge](03-local-tool.md).
