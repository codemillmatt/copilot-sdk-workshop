# Step 1: Create your first Copilot session

> **Pace:** Self-paced

## What you'll build

You'll connect the console application to the Copilot runtime, create a conversation, send a
prompt, and print the response.

## Follow one request through the harness

The SDK is the API your code calls; it is not the model. The Copilot CLI runtime is the
**agent harness**: it maintains conversation state, sends model requests, coordinates requested
tools, and emits events. The model proposes text or tool calls. Your application supplies local
tool implementations and decides which capabilities and permissions the session has.

SDK means **software development kit**. Instead of asking a person to drive the Copilot interface,
your program supplies the inputs and consumes the results in its own interface. The installed CLI
provides the runtime underneath; your application's users do not have to type CLI prompts.

<!-- code-id: 01-first-session-shared-1 -->
```text
Your application -> SDK client -> Copilot CLI runtime -> model service
                                      ^                    |
                                      |    text/tool request
                                      +--------------------+
                                      |
                         permitted tool executes
                         -> result joins session context
                         -> model may be called again
```

A **user request** starts with your prompt and can include several **assistant turns** before
the session becomes idle. In the SDK event stream, an assistant turn is one model request and
its consequences, including requested tools; `assistant.turn_start` and `assistant.turn_end`
mark those iterations. A **session** holds the conversation across user requests; the SDK object
is a handle to conversation state managed by the runtime. The first example
explicitly exposes no tools, so it only asks the model for text. Later lessons add capabilities
deliberately. Logging in authorizes model access; it does not grant the application permission to
read your files or browse arbitrary sites.

Before running, predict which part executes your code and which part produces the response.
Keep this diagram nearby when tools enter the picture.

:::language dotnet
## Meet the GitHub Copilot SDK and runtime

The **GitHub Copilot SDK** is the .NET API your application uses to run Copilot as an agent. The
[**Copilot runtime**](https://github.com/github/copilot-sdk/blob/main/docs/features/agent-loop.md)
receives prompts, calls models, and manages tools. `CopilotClient` connects your C# code to that
runtime.

A `CopilotSession` represents one continuing conversation. It holds the messages and tool results
that make up the conversation's context. Keep one client alive for the application, then create a
session for each independent conversation.

## Why clients and sessions stay separate

Keeping those responsibilities separate lets the runtime connection outlive any one conversation.
It also gives you a small working example before streaming and tools enter the picture.

At this point, the console app is simply `CopilotClient -> CopilotSession -> model response`.
:::

:::language nodejs
## Meet the GitHub Copilot SDK and runtime

The **GitHub Copilot SDK** is the Node.js API your application uses to run Copilot as an agent. The
[**Copilot runtime**](https://github.com/github/copilot-sdk/blob/main/docs/features/agent-loop.md)
receives prompts, calls models, and manages tools. `CopilotClient` connects your TypeScript code to
that runtime.

A session from `createSession` represents one continuing conversation. It holds the messages and
tool results that make up the conversation's context. Keep one client alive for the application,
then create a session for each independent conversation.

## Why clients and sessions stay separate

Keeping those responsibilities separate lets the runtime connection outlive any one conversation.
It also gives you a small working example before streaming and tools enter the picture.

At this point, the console app is simply `CopilotClient -> session -> model response`.
:::

:::language python
## Meet the GitHub Copilot SDK and runtime

The **GitHub Copilot SDK** is the Python API your application uses to run Copilot as an agent. The
[**Copilot runtime**](https://github.com/github/copilot-sdk/blob/main/docs/features/agent-loop.md)
receives prompts, calls models, and manages tools. `CopilotClient` connects your Python code to
that runtime.

A session from `create_session` represents one continuing conversation. It holds the messages and
tool results that make up the conversation's context. Keep one client alive for the application,
then create a session for each independent conversation.

## Why clients and sessions stay separate

Keeping those responsibilities separate lets the runtime connection outlive any one conversation.
It also gives you a small working example before streaming and tools enter the picture.

At this point, the console app is simply `CopilotClient -> session -> model response`.
:::

:::language go
## Meet the GitHub Copilot SDK and runtime

The **GitHub Copilot SDK** is the Go API your application uses to run Copilot as an agent. The
[**Copilot runtime**](https://github.com/github/copilot-sdk/blob/main/docs/features/agent-loop.md)
receives prompts, calls models, and manages tools. `copilot.NewClient` connects your Go code to
that runtime.

A session from `CreateSession` represents one continuing conversation. It holds the messages and
tool results that make up the conversation's context. Keep one client alive for the application,
then create a session for each independent conversation.

## Why clients and sessions stay separate

Keeping those responsibilities separate lets the runtime connection outlive any one conversation.
It also gives you a small working example before streaming and tools enter the picture.

At this point, the console app is simply `Client -> Session -> model response`.

`main` reports the error returned by `run` only after cleanup defers have executed.
Put later orchestration edits inside `run`, not the thin `main` wrapper. Cleanup
errors are joined with the main error instead of silently replacing it.

:::

:::language rust
## Meet the GitHub Copilot SDK and runtime

The **GitHub Copilot SDK** is the Rust API your application uses to run Copilot as an agent. The
[**Copilot runtime**](https://github.com/github/copilot-sdk/blob/main/docs/features/agent-loop.md)
receives prompts, calls models, and manages tools. `Client` connects your Rust code to that
runtime.

A session from `create_session` represents one continuing conversation. It holds the messages and
tool results that make up the conversation's context. Keep one client alive for the application,
then create a session for each independent conversation.

## Why clients and sessions stay separate

Keeping those responsibilities separate lets the runtime connection outlive any one conversation.
It also gives you a small working example before streaming and tools enter the picture.

At this point, the console app is simply `Client -> session -> model response`.
:::

:::language java
## Meet the GitHub Copilot SDK and runtime

The **GitHub Copilot SDK** is the Java API your application uses to run Copilot as an agent. The
[**Copilot runtime**](https://github.com/github/copilot-sdk/blob/main/docs/features/agent-loop.md)
receives prompts, calls models, and manages tools. `CopilotClient` connects your Java code to that
runtime.

A session from `createSession` represents one continuing conversation. It holds the messages and
tool results that make up the conversation's context. Keep one client alive for the application,
then create a session for each independent conversation.

## Why clients and sessions stay separate

Keeping those responsibilities separate lets the runtime connection outlive any one conversation.
It also gives you a small working example before streaming and tools enter the picture.

At this point, the console app is simply `CopilotClient -> session -> model response`.
:::

## Fire up your first Copilot session

:::language dotnet
Open `Program.cs` and **replace the entire file**:

<!-- code-id: 01-first-session-dotnet-1 -->
```csharp
using System;
using System.Threading.Tasks;
using GitHub.Copilot;
using GitHub.Copilot.Rpc;

#pragma warning disable GHCP001 // Custom permission decisions are evaluation-only in SDK 1.0.11.

Console.WriteLine("=== First Copilot session ===\n");

await using var client = new CopilotClient();
await client.StartAsync();

var ping = await client.PingAsync("workshop");
Console.WriteLine($"Connected to the Copilot runtime: {ping.Message}");

await using var session = await client.CreateSessionAsync(new SessionConfig
{
    AvailableTools = [],
    OnPermissionRequest = (_, _) => Task.FromResult(
        PermissionDecision.Reject("This session does not allow unexpected permission requests."))
});
var response = await session.SendAndWaitAsync(
    "In one sentence, explain why an accessible name matters for a form input.",
    timeout: TimeSpan.FromSeconds(120));

if (string.IsNullOrWhiteSpace(response?.Data.Content))
{
    throw new InvalidOperationException("Copilot completed without an assistant message.");
}

Console.WriteLine($"\nCopilot: {response.Data.Content}");

#pragma warning restore GHCP001
```

The ping verifies the runtime connection. The completed-response send waits until the session
becomes idle, so it works well when you only need the finished answer.
:::

:::language nodejs
Open `src/index.ts` and **replace the entire file**:

<!-- code-id: 01-first-session-nodejs-1 -->
```typescript
import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient();
try {
  await client.start();
  const session = await client.createSession({ availableTools: [], onPermissionRequest: () => ({ kind: "reject", feedback: "This session does not allow that permission request." }) });
  try {
    const response = await session.sendAndWait({ prompt: "Reply with one sentence confirming this Copilot session is ready." });
    console.log(response?.data && "content" in response.data ? response.data.content : response);
  } finally {
    await session.disconnect();
  }
} finally {
  await client.stop();
}
```

`sendAndWait` waits until the session becomes idle, so it works well when you only need the finished
answer. Always stop the session and client in `finally` blocks so the runtime shuts down cleanly.
:::

:::language python
Open `main.py` and **replace the entire file**:

<!-- code-id: 01-first-session-python-1 -->
```python
import asyncio

from copilot import CopilotClient
from copilot.rpc import PermissionDecisionReject
from copilot.session_events import AssistantMessageData


async def main() -> None:
    print("=== First Copilot session ===")
    async with CopilotClient() as client:
        async with await client.create_session(
            available_tools=[],
            on_permission_request=lambda _request, _invocation: PermissionDecisionReject(
                feedback="This session does not allow that permission request."
            ),
        ) as session:
            response = await session.send_and_wait(
                "Reply with one sentence confirming this Copilot session is ready.",
                timeout=120,
            )
            if (response is None or not isinstance(response.data, AssistantMessageData)
                    or not response.data.content.strip()):
                raise RuntimeError("Copilot completed without an assistant response.")
            print(response.data.content)


if __name__ == "__main__":
    asyncio.run(main())
```

`send_and_wait` owns the event wait and returns the completed response event. Its data contains
the assistant message. The checks reject missing or blank text, and the async context managers
release the session before the client. Step 2 makes progressive events visible.
:::

:::language go
Open `main.go` and **replace the entire file**:

<!-- code-id: 01-first-session-go-1 -->
```go
package main

import (
	"context"
	"errors"
	"fmt"
	"github.com/github/copilot-sdk/go/rpc"
	"os"

	copilot "github.com/github/copilot-sdk/go"
)

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
		AvailableTools: []string{},
		OnPermissionRequest: func(_ copilot.PermissionRequest, _ copilot.PermissionInvocation) (rpc.PermissionDecision, error) {
			return &rpc.PermissionDecisionReject{}, nil
		},
	})
	if err != nil {
		return err
	}
	defer func() { err = errors.Join(err, session.Disconnect()) }()

	response, err := session.SendAndWait(context.Background(), copilot.MessageOptions{
		Prompt: "In one sentence, explain why an accessible name matters for a form input.",
	})
	if err != nil {
		return err
	}
	if response != nil {
		if message, ok := response.Data.(*copilot.AssistantMessageData); ok {
			fmt.Println(message.Content)
		}
	}
	return nil
}
```

`SendAndWait` waits until the session becomes idle, so it works well when you only need the finished
answer. `defer` disconnects the session and stops the client on the way out.

`main` reports the error returned by `run` only after cleanup defers have executed.
Put later orchestration edits inside `run`, not the thin `main` wrapper. Cleanup
errors are joined with the main error instead of silently replacing it.

:::

:::language rust
Open `src/main.rs` and **replace the entire file**:

<!-- code-id: 01-first-session-rust-1 -->
```rust
use github_copilot_sdk::permission;
use github_copilot_sdk::types::{MessageOptions, SessionConfig};
use github_copilot_sdk::{Client, ClientOptions};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut config = SessionConfig::default().with_permission_handler(permission::deny_all());
    config.available_tools = Some(vec![]);

    let client = Client::start(ClientOptions::default()).await?;
    let result = async {
        let session = client.create_session(config).await?;
        let response_result = async {
            let response = session
                .send_and_wait(MessageOptions::new(
                    "In one sentence, explain why an accessible name matters for a form input.",
                ))
                .await?;
            if let Some(message) = response {
                if let Some(content) = message.data.get("content").and_then(|value| value.as_str())
                {
                    println!("{content}");
                }
            }
            Ok::<(), Box<dyn std::error::Error>>(())
        }
        .await;
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

`send_and_wait` waits until the session becomes idle, so it works well when you only need the
finished answer. Disconnect the session and stop the client before returning.
:::

:::language java
Open `src/main/java/workshop/AccessibilityReport.java` and **replace the entire file**:

<!-- code-id: 01-first-session-java-1 -->
```java
package workshop;

import com.github.copilot.CopilotClient;
import com.github.copilot.rpc.MessageOptions;
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
                        PermissionRequestResult.reject("This session does not allow unexpected permission requests.")));
            try (var session = client.createSession(config).get()) {
                var response = session.sendAndWait(new MessageOptions().setPrompt(
                        "In one sentence, explain why an accessible name matters for a form input."), 120_000).get();
                String content = response == null || response.getData() == null
                        ? null : response.getData().content();
                if (content == null || content.isBlank()) {
                    throw new IllegalStateException("Copilot completed without an assistant response.");
                }
                System.out.println(content);
            }
        }
    }
}
```

`sendAndWait` waits until the session becomes idle, so it works well when you only need the finished
answer. The try-with-resources block closes the client when `main` exits.
:::

This session exposes no tools and rejects unexpected permission requests. It still uses the SDK's
default persona.

<details>
<summary>Reference: choosing a system-message mode later</summary>

The knob you did not turn is the
[system message](https://github.com/github/copilot-sdk/blob/main/docs/getting-started.md#customize-the-system-message),
which has three modes. `append` is the default: your content is added after the SDK-managed prompt,
and the default CLI persona is preserved along with the environment context, tool instructions, and
security guardrails the SDK injects. `replace` swaps the entire prompt for your content.
`customize` overrides individual sections — tone, guidelines, code change rules, and others — while
preserving the rest. This workshop stays on the default, so every answer you see comes from the
standard persona. Reach for the other two modes when an application needs a voice or a scope of its
own.

</details>

## Run it

:::language dotnet
```bash
dotnet run
```
:::
:::language nodejs
```bash
npm start
```
:::
:::language python
```bash
python main.py
```
:::
:::language go
```bash
go run .
```

`main` reports the error returned by `run` only after cleanup defers have executed.
Put later orchestration edits inside `run`, not the thin `main` wrapper. Cleanup
errors are joined with the main error instead of silently replacing it.

:::
:::language rust
```bash
cargo run
```
:::
:::language java
```bash
mvn compile exec:java
```
:::

:::language dotnet
Your exact response will vary, but the output should have this shape:

<!-- code-id: 01-first-session-dotnet-2 -->
```text
=== First Copilot session ===

Connected to the Copilot runtime: ...

Copilot: An accessible name lets assistive technology identify the input's purpose.
```
:::

:::language nodejs
Your exact response will vary, but the output should have this shape:

<!-- code-id: 01-first-session-nodejs-2 -->
```text
This Copilot session is ready and waiting for your next prompt.
```
:::

:::language python
Your exact response will vary, but the output should have this shape:

<!-- code-id: 01-first-session-python-2 -->
```text
An accessible name lets assistive technology identify the input's purpose.
```
:::

:::language go
Your exact response will vary, but the output should have this shape:

<!-- code-id: 01-first-session-go-2 -->
```text
An accessible name lets assistive technology identify the input's purpose.
```

`main` reports the error returned by `run` only after cleanup defers have executed.
Put later orchestration edits inside `run`, not the thin `main` wrapper. Cleanup
errors are joined with the main error instead of silently replacing it.

:::

:::language rust
Your exact response will vary, but the output should have this shape:

<!-- code-id: 01-first-session-rust-2 -->
```text
An accessible name lets assistive technology identify the input's purpose.
```
:::

:::language java
Your exact response will vary, but the output should have this shape:

<!-- code-id: 01-first-session-java-2 -->
```text
An accessible name lets assistive technology identify the input's purpose.
```
:::

<details>
<summary>Troubleshooting this run</summary>

| Symptom | Fix |
|---|---|
| Authentication or authorization error | Run `copilot login` again, then rerun the project. |
| Runtime executable not found | Follow your selected language's CLI-path instructions in preflight; the environment variable is not the same for every SDK. |
| The request times out | Check network access to GitHub Copilot and retry; this example does not hide the failure. |

</details>

> **You're ready for streaming when:** the terminal prints one complete Copilot response.

## Check your understanding

Which object should usually live for the application lifetime, and which object owns one
conversation's context?

:::language dotnet
<details>
<summary>Check your answer</summary>

Keep `CopilotClient` for the lifetime of the runtime connection. A `CopilotSession` owns the
messages and tool context for one conversation.

</details>
:::

:::language nodejs
<details>
<summary>Check your answer</summary>

Keep `CopilotClient` for the lifetime of the runtime connection. A session from `createSession` owns
the messages and tool context for one conversation.

</details>
:::

:::language python
<details>
<summary>Check your answer</summary>

Keep `CopilotClient` for the lifetime of the runtime connection. A session from `create_session`
owns the messages and tool context for one conversation.

</details>
:::

:::language go
<details>
<summary>Check your answer</summary>

Keep the client from `copilot.NewClient` for the lifetime of the runtime connection. A session from
`CreateSession` owns the messages and tool context for one conversation.

</details>

`main` reports the error returned by `run` only after cleanup defers have executed.
Put later orchestration edits inside `run`, not the thin `main` wrapper. Cleanup
errors are joined with the main error instead of silently replacing it.

:::

:::language rust
<details>
<summary>Check your answer</summary>

Keep `Client` for the lifetime of the runtime connection. A session from `create_session` owns the
messages and tool context for one conversation.

</details>
:::

:::language java
<details>
<summary>Check your answer</summary>

Keep `CopilotClient` for the lifetime of the runtime connection. A session from `createSession` owns
the messages and tool context for one conversation.

</details>
:::

:::language dotnet
<details>
<summary>Complete Step 1 implementation</summary>

Compare your work with this complete Step 1 implementation.

<!-- code-id: 01-first-session-dotnet-3 -->
```csharp
using System;
using System.Threading.Tasks;
using GitHub.Copilot;
using GitHub.Copilot.Rpc;

#pragma warning disable GHCP001 // Custom permission decisions are evaluation-only in SDK 1.0.11.

Console.WriteLine("=== First Copilot session ===\n");

await using var client = new CopilotClient();
await client.StartAsync();

var ping = await client.PingAsync("workshop");
Console.WriteLine($"Connected to the Copilot runtime: {ping.Message}");

await using var session = await client.CreateSessionAsync(new SessionConfig
{
    AvailableTools = [],
    OnPermissionRequest = (_, _) => Task.FromResult(
        PermissionDecision.Reject("This session does not allow unexpected permission requests."))
});
var response = await session.SendAndWaitAsync(
    "In one sentence, explain why an accessible name matters for a form input.",
    timeout: TimeSpan.FromSeconds(120));

if (string.IsNullOrWhiteSpace(response?.Data.Content))
{
    throw new InvalidOperationException("Copilot completed without an assistant message.");
}

Console.WriteLine($"\nCopilot: {response.Data.Content}");

#pragma warning restore GHCP001
```
</details>
:::

:::language nodejs
<details>
<summary>Complete Step 1 implementation</summary>

Compare your work with this complete Step 1 implementation.

<!-- code-id: 01-first-session-nodejs-3 -->
```typescript
import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient();
try {
  await client.start();
  const session = await client.createSession({ availableTools: [], onPermissionRequest: () => ({ kind: "reject", feedback: "This session does not allow that permission request." }),});
  try {
    const response = await session.sendAndWait({ prompt: "Reply with one sentence confirming this Copilot session is ready." });
    console.log(response?.data && "content" in response.data ? response.data.content : response);
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
<details>
<summary>Complete Step 1 implementation</summary>

Compare your work with this complete Step 1 implementation.

<!-- code-id: 01-first-session-python-3 -->
```python
import asyncio

from copilot import CopilotClient
from copilot.rpc import PermissionDecisionReject
from copilot.session_events import AssistantMessageData


async def main() -> None:
    print("=== First Copilot session ===")
    async with CopilotClient() as client:
        async with await client.create_session(
            available_tools=[],
            on_permission_request=lambda _request, _invocation: PermissionDecisionReject(
                feedback="This session does not allow that permission request."
            ),
        ) as session:
            response = await session.send_and_wait(
                "Reply with one sentence confirming this Copilot session is ready.",
                timeout=120,
            )
            if (response is None or not isinstance(response.data, AssistantMessageData)
                    or not response.data.content.strip()):
                raise RuntimeError("Copilot completed without an assistant response.")
            print(response.data.content)


if __name__ == "__main__":
    asyncio.run(main())
```
</details>
:::

:::language go
<details>
<summary>Complete Step 1 implementation</summary>

Compare your work with this complete Step 1 implementation.

<!-- code-id: 01-first-session-go-3 -->
```go
package main

import (
	"context"
	"errors"
	"fmt"
	"github.com/github/copilot-sdk/go/rpc"
	"os"

	copilot "github.com/github/copilot-sdk/go"
)

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
		AvailableTools: []string{},
		OnPermissionRequest: func(_ copilot.PermissionRequest, _ copilot.PermissionInvocation) (rpc.PermissionDecision, error) {
			return &rpc.PermissionDecisionReject{}, nil
		},
	})
	if err != nil {
		return err
	}
	defer func() { err = errors.Join(err, session.Disconnect()) }()

	response, err := session.SendAndWait(context.Background(), copilot.MessageOptions{
		Prompt: "In one sentence, explain why an accessible name matters for a form input.",
	})
	if err != nil {
		return err
	}
	if response != nil {
		if message, ok := response.Data.(*copilot.AssistantMessageData); ok {
			fmt.Println(message.Content)
		}
	}
	return nil
}
```
</details>

`main` reports the error returned by `run` only after cleanup defers have executed.
Put later orchestration edits inside `run`, not the thin `main` wrapper. Cleanup
errors are joined with the main error instead of silently replacing it.

:::

:::language rust
<details>
<summary>Complete Step 1 implementation</summary>

Compare your work with this complete Step 1 implementation.

<!-- code-id: 01-first-session-rust-3 -->
```rust
use github_copilot_sdk::permission;
use github_copilot_sdk::types::{MessageOptions, SessionConfig};
use github_copilot_sdk::{Client, ClientOptions};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut config = SessionConfig::default().with_permission_handler(permission::deny_all());
    config.available_tools = Some(vec![]);

    let client = Client::start(ClientOptions::default()).await?;
    let result = async {
        let session = client.create_session(config).await?;
        let response_result = async {
            let response = session
                .send_and_wait(MessageOptions::new(
                    "In one sentence, explain why an accessible name matters for a form input.",
                ))
                .await?;
            if let Some(message) = response {
                if let Some(content) = message.data.get("content").and_then(|value| value.as_str())
                {
                    println!("{content}");
                }
            }
            Ok::<(), Box<dyn std::error::Error>>(())
        }
        .await;
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
<details>
<summary>Complete Step 1 implementation</summary>

Compare your work with this complete Step 1 implementation.

<!-- code-id: 01-first-session-java-3 -->
```java
package workshop;

import com.github.copilot.CopilotClient;
import com.github.copilot.rpc.MessageOptions;
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
                        PermissionRequestResult.reject("This session does not allow unexpected permission requests.")));
            try (var session = client.createSession(config).get()) {
                var response = session.sendAndWait(new MessageOptions().setPrompt(
                        "In one sentence, explain why an accessible name matters for a form input."), 120_000).get();
                String content = response == null || response.getData() == null
                        ? null : response.getData().content();
                if (content == null || content.isBlank()) {
                    throw new IllegalStateException("Copilot completed without an assistant response.");
                }
                System.out.println(content);
            }
        }
    }
}
```
</details>
:::

## Learn more

- [Build your first Copilot-powered app](https://docs.github.com/en/copilot/how-tos/copilot-sdk/getting-started):
  GitHub's tutorial for the same first client, session, and prompt.
- [Session resume and persistence](https://github.com/github/copilot-sdk/blob/main/docs/features/session-persistence.md):
  how a session's conversation state is kept, and how to resume it after a restart.
- [Context clearing](https://github.com/github/copilot-sdk/blob/main/docs/features/context-management.md):
  replacing the conversation inside a session without creating a new one.
- [Authentication](https://github.com/github/copilot-sdk/blob/main/docs/auth/README.md):
  the credentials a client can use once you move past `copilot login`.

Continue to [Step 2: Stream a response](02-streaming.md).
