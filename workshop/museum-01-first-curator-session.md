# Step 1: Your first curator session

> **Pace:** Self-paced

## What you'll build

Send a prompt through the GitHub Copilot SDK and print the model's two-sentence response about Apollo 11.
This checks the connection before we add facts or tools.
Continue in the starter folder from preflight.

## Meet the client and the session

The **curator agent** is the model-driven worker you configure for museum drafting.
Its behavior combines a model, instructions, conversation context, and available tools.
It is not an extra process or a single SDK object.
Tools are optional. The first session exposes none.

| Component | Its job, not a separate agent |
|---|---|
| GitHub Copilot SDK and client | Give your code access to the Copilot CLI runtime. |
| SDK session | Identify one conversation and its context. |
| Copilot CLI harness | Run the model-and-tool loop and manage conversation state. |
| Model | Generate text and tool requests from the supplied context. |
| Tool | Execute a specific function when called. |

<figure class="museum-diagram">
  <img src="{{ASSET_BASE_URL}}museum-client-session.svg" width="600" height="820" alt="The educator uses the application. Its SDK client connects to the Copilot CLI harness. An SDK session identifies conversation state there. The harness sends context to the model service and returns its reply.">
  <figcaption>The curator agent uses these components. The Copilot CLI harness runs the loop, and the SDK gives your application access to it.</figcaption>
</figure>

Your application creates a session, sends a **prompt** (the request), prints the reply, then releases its resources.
Separate conversations can use the same model.

This first session has an **explicit empty tool allowlist** and rejects unexpected permission requests.
The list exposes no tools. The rejection callback answers authorization requests rather than leaving them pending.
Authentication to the model service is a separate concern.

## Write the session

Read the replacement once before running it.
Find the client, the session settings, the prompt, and the cleanup code.
The cleanup releases resources when the request finishes or fails.

:::language dotnet
Open `Program.cs` and **replace the entire file**:

<!-- code-id: museum-01-first-curator-session-dotnet-1 -->
```csharp
using System;
using System.Threading.Tasks;
using GitHub.Copilot;
using GitHub.Copilot.Rpc;

#pragma warning disable GHCP001 // Custom permission decisions are evaluation-only in SDK 1.0.11.

Console.WriteLine("=== Museum Exhibit Studio ===");
Console.WriteLine();

await using var client = new CopilotClient();
await client.StartAsync();

await using var session = await client.CreateSessionAsync(new SessionConfig
{
    ClientName = "museum-exhibit-studio",
    AvailableTools = [],
    OnPermissionRequest = (_, _) => Task.FromResult(
        PermissionDecision.Reject("This session does not allow unexpected permission requests."))
});

var response = await session.SendAndWaitAsync(
    "Write two sentences of museum wall text about the Apollo 11 Moon landing.",
    timeout: TimeSpan.FromSeconds(120));

if (string.IsNullOrWhiteSpace(response?.Data.Content))
{
    throw new InvalidOperationException("The curator returned no content.");
}

Console.WriteLine(response.Data.Content);

#pragma warning restore GHCP001
```

`StartAsync` connects the client to the runtime.
`CreateSessionAsync` creates the conversation with the supplied settings.
`SendAndWaitAsync` sends the prompt and waits for the completed response.
The `await using` scopes release the session before the client, including on failure.

The rejection callback uses `PermissionDecision` from `GitHub.Copilot.Rpc`.
The narrow `GHCP001` opt-in acknowledges that the pinned SDK marks this API as experimental.
Keep it with the example.

The supplied helpers live in `Helpers/CuratorFacts.cs`, `Helpers/CuratorStreamer.cs`,
`Helpers/CuratorValidation.cs`, `Helpers/CuratorSafety.cs`, and `Helpers/CuratorTerminal.cs`.
You start using them in Step 2. Keep those files unchanged during the workshop.
:::

:::language nodejs
Open `src/index.ts` and **replace the entire file**:

<!-- code-id: museum-01-first-curator-session-nodejs-1 -->
```typescript
import { CopilotClient } from "@github/copilot-sdk";

async function main(): Promise<void> {
  console.log("=== Museum Exhibit Studio ===");
  console.log();

  const client = new CopilotClient();
  try {
    await client.start();
    const session = await client.createSession({ availableTools: [],
      clientName: "museum-exhibit-studio",
      onPermissionRequest: () => ({ kind: "reject", feedback: "This session does not allow that permission request." }),
    });
    try {
      const response = await session.sendAndWait({
        prompt: "Write two sentences of museum wall text about the Apollo 11 Moon landing.",
      });
      console.log(response?.data && "content" in response.data ? response.data.content : response);
    } finally {
      await session.disconnect();
    }
  } finally {
    await client.stop();
  }
}

void main();
```

`client.start()` connects the client to the runtime.
`createSession` creates the conversation using the settings in its argument.
`sendAndWait` sends the prompt and waits for the completed response.
The final `console.log` prints the returned content when it is present.

The `finally` blocks release the session and client when the work ends or throws an error.
`clientName` labels this application. It does not identify the conversation.

The supplied helper module is `src/curator.ts`.
You start using it in Step 2. Keep it unchanged during the workshop.
:::

:::language python
Open `main.py` and **replace the entire file**:

<!-- code-id: museum-01-first-curator-session-python-1 -->
```python
import asyncio

from copilot import CopilotClient
from copilot.rpc import PermissionDecisionReject
from copilot.session_events import AssistantMessageData


async def main() -> None:
    print("=== Museum Exhibit Studio ===")
    async with CopilotClient() as client:
        async with await client.create_session(
            available_tools=[],
            on_permission_request=lambda _request, _invocation: PermissionDecisionReject(
                feedback="This session does not allow that permission request."
            ),
        ) as session:
            response = await session.send_and_wait(
                "Write two sentences of museum wall text about the Apollo 11 Moon landing.",
                timeout=120,
            )
            if (response is None or not isinstance(response.data, AssistantMessageData)
                    or not response.data.content.strip()):
                raise RuntimeError("Copilot completed without an assistant response.")
            print(response.data.content)


if __name__ == "__main__":
    asyncio.run(main())
```

The first `async with` starts the client and arranges its cleanup.
`create_session` creates a conversation with the supplied settings.
`send_and_wait` sends the prompt and returns a response event.
The code checks that its data contains nonblank assistant text before printing it.

The nested context manager releases the session before the client, including on failure.
The supplied helper module is `curator.py`.
You start using its streaming function in Step 2. Keep the helper unchanged.
:::

:::language go
Open `main.go` and **replace the entire file**:

<!-- code-id: museum-01-first-curator-session-go-1 -->
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
	fmt.Println("=== Museum Exhibit Studio ===")
	fmt.Println()

	ctx := context.Background()
	client := copilot.NewClient(&copilot.ClientOptions{LogLevel: "error"})
	defer func() { err = errors.Join(err, client.Stop()) }()
	if err := client.Start(ctx); err != nil {
		return err
	}

	session, err := client.CreateSession(ctx, &copilot.SessionConfig{
		AvailableTools: []string{},
		ClientName:     "museum-exhibit-studio",
		OnPermissionRequest: func(_ copilot.PermissionRequest, _ copilot.PermissionInvocation) (rpc.PermissionDecision, error) {
			return &rpc.PermissionDecisionReject{}, nil
		},
	})
	if err != nil {
		return err
	}
	defer func() { err = errors.Join(err, session.Disconnect()) }()

	response, err := session.SendAndWait(ctx, copilot.MessageOptions{
		Prompt: "Write two sentences of museum wall text about the Apollo 11 Moon landing.",
	})
	if err != nil {
		return err
	}
	if response == nil {
		return errors.New("The curator returned no content.")
	}
	if message, ok := response.Data.(*copilot.AssistantMessageData); ok {
		fmt.Println(message.Content)
	}
	return nil
}
```

`NewClient` creates the client, and `Start` connects it to the runtime.
`CreateSession` creates the conversation.
`SendAndWait` sends the prompt and waits for completion.
The code checks the response type before printing its content.

The `defer` calls arrange cleanup when `run` returns.
`main` reports any error after that cleanup.
Later edits belong inside `run`, not the small `main` wrapper.
The supplied `curator.go` file shares this package. Keep it unchanged.

:::

:::language rust
Open `src/main.rs` and **replace the entire file**:

<!-- code-id: museum-01-first-curator-session-rust-1 -->
```rust
use github_copilot_sdk::permission;
use github_copilot_sdk::types::{MessageOptions, SessionConfig};
use github_copilot_sdk::{Client, ClientOptions};
use museum_exhibit_studio::RuntimeError;

#[tokio::main]
async fn main() -> Result<(), RuntimeError> {
    println!("=== Museum Exhibit Studio ===");
    println!();

    let mut config = SessionConfig::default().with_permission_handler(permission::deny_all());
    config.client_name = Some("museum-exhibit-studio".to_owned());
    config.available_tools = Some(vec![]);

    let client = Client::start(ClientOptions::default()).await?;
    let result = async {
        let session = client.create_session(config).await?;
        let response_result = async {
            let response = session
                .send_and_wait(MessageOptions::new(
                    "Write two sentences of museum wall text about the Apollo 11 Moon landing.",
                ))
                .await?;

            if let Some(message) = response {
                if let Some(content) = message.data.get("content").and_then(|value| value.as_str())
                {
                    println!("{content}");
                }
            }
            Ok::<(), RuntimeError>(())
        }
        .await;
        let cleanup = session.disconnect().await;
        if let Err(error) = cleanup {
            if response_result.is_ok() {
                return Err(Box::new(error) as RuntimeError);
            }
            eprintln!("Session cleanup also failed: {error}");
        }
        response_result
    }
    .await;
    let cleanup = client.stop().await;
    if let Err(error) = cleanup {
        if result.is_ok() {
            return Err(Box::new(error) as RuntimeError);
        }
        eprintln!("Client cleanup also failed: {error}");
    }
    result
}
```

`Client::start` creates the runtime connection.
`create_session` creates the conversation.
`send_and_wait` sends the prompt and waits for the completed response.
The code handles that result before returning so it can disconnect the session and stop the client.

The supplied library crate is `museum_exhibit_studio`, defined in `src/lib.rs`.
`RuntimeError` is its alias for `Box<dyn Error + Send + Sync>`.
It gives these examples a common error type for the `?` operator.
Keep the library unchanged during the workshop.

`with_permission_handler` returns the updated configuration.
Set the remaining fields on that returned value, as shown.
:::

:::language java
Open `src/main/java/workshop/MuseumExhibitStudio.java` and **replace the entire file**:

<!-- code-id: museum-01-first-curator-session-java-1 -->
```java
package workshop;

import com.github.copilot.CopilotClient;
import com.github.copilot.rpc.MessageOptions;
import com.github.copilot.rpc.SessionConfig;
import com.github.copilot.rpc.PermissionRequestResult;
import java.util.List;
import java.util.concurrent.CompletableFuture;

public final class MuseumExhibitStudio {
    private MuseumExhibitStudio() {
    }

    public static void main(String[] args) throws Exception {
        System.out.println("=== Museum Exhibit Studio ===");
        System.out.println();
        try (var client = new CopilotClient()) {
            client.start().get();
            var config = new SessionConfig()
                    .setClientName("museum-exhibit-studio")
                    .setAvailableTools(List.of())
                    .setOnPermissionRequest((request, ignored) -> CompletableFuture.completedFuture(
                        PermissionRequestResult.reject("This session does not allow unexpected permission requests.")));
            try (var session = client.createSession(config).get()) {
                var response = session.sendAndWait(new MessageOptions().setPrompt(
                        "Write two sentences of museum wall text about the Apollo 11 Moon landing."), 120_000).get();
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

`client.start()` connects the client to the runtime.
`createSession` creates the conversation.
`sendAndWait` sends the prompt and returns a future for completion.
The call to `get()` waits for that future. The response checks reject missing or blank text.

Nested try-with-resources scopes release the session before the client, including on failure.
The supplied helpers are in `src/main/java/workshop/`.
They include `CuratorFacts.java`, `CuratorStreamer.java`, `CuratorValidation.java`,
`CuratorSafety.java`, and `CuratorTerminal.java`.
You start using them in Step 2. Keep them unchanged.
:::

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
<div class="workshop-tabs" data-tabs>
  <div role="tablist" aria-label="Run the Python museum application">
    <button type="button" role="tab" aria-selected="true" data-tab="run-python-windows">PowerShell</button>
    <button type="button" role="tab" aria-selected="false" data-tab="run-python-unix">Bash</button>
  </div>
  <div role="tabpanel" data-panel="run-python-windows">
    <pre><code class="language-powershell">.venv/Scripts/python.exe main.py</code></pre>
  </div>
  <div role="tabpanel" data-panel="run-python-unix" hidden>
    <pre><code class="language-bash">.venv/bin/python main.py</code></pre>
  </div>
</div>
:::
:::language go
```bash
go run .
```

The `main` wrapper reports errors after `run` performs cleanup.
Keep later orchestration edits inside `run`.

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

Your exact wording will vary, but the output has this shape:

<!-- code-id: museum-01-first-curator-session-shared-2 -->
```text
=== Museum Exhibit Studio ===

The Apollo 11 mission carried three astronauts toward the Moon in July 1969. Days later,
two of them stepped onto its surface while the world listened.
```

Check that a response appears and the process finishes.
Your wording can differ from the example. The model has no approved fact list yet,
so do not use this response as a museum label.

If sign-in fails, return to preflight's account instructions.
If the Copilot CLI runtime cannot start, check its installation.
Keep permission rejection in place while diagnosing the connection.

Next we'll make the response visible while it arrives, rather than waiting for all the text.

## Check your understanding

Which object connects to the Copilot CLI harness, and which identifies a conversation? Is either object the complete agent?

<details>
<summary>Check your answer</summary>

The SDK client manages the connection. The session identifies a conversation managed by the Copilot CLI runtime.
Neither is the complete agent or the model.

</details>

## Learn more

Optional reference: [Build your first app with the GitHub Copilot SDK](https://docs.github.com/en/copilot/how-tos/copilot-sdk/getting-started).

Continue to [Stream the curator](museum-02-stream-the-curator.md).
