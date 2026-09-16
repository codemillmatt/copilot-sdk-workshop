# Step 2: Stream the curator

> **Pace:** Self-paced

## What you'll build

Keep the Apollo 11 prompt, but show text as it arrives.
**Streaming** lets the educator start reading before the whole response finishes.
Continue where you left off from Step 1. You'll keep tools disabled.

The Copilot CLI runtime emits **events** for new text, tool activity, errors, and completion through the SDK.
A text **delta** is a new chunk, not necessarily a whole word.
Enabling streaming requests those updates. A callback must still consume them.

The starter supplies that callback. It prints updates, retains the response, handles errors and a deadline, and releases its subscription.
Later, the validator will use the retained text.

## Swap the blocking call for the streamer

Enable streaming and replace the completed-response call together.
Changing the setting alone does not print events.
Keep the prompt and permission settings unchanged so you can compare the two response paths.

:::language dotnet
Replace the entire contents of `Program.cs`:

<!-- code-id: museum-02-stream-the-curator-dotnet-1 -->
```csharp
using System;
using System.Threading.Tasks;
using GitHub.Copilot;
using GitHub.Copilot.Rpc;
using MuseumExhibitStudio.Helpers;

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
        PermissionDecision.Reject("This session does not allow unexpected permission requests.")),
    Streaming = true
});

await CuratorStreamer.StreamExhibitAsync(
    session,
    "Write two sentences of museum wall text about the Apollo 11 Moon landing.");

#pragma warning restore GHCP001
```

The session setting `Streaming = true` enables streaming.
`CuratorStreamer.StreamExhibitAsync` replaces the completed-response call to `SendAndWaitAsync`.
Keep the empty tool list and permission handler from Step 1.

Open `Helpers/CuratorStreamer.cs`.
Find `CuratorStreamer.StreamExhibitAsync`, the supplied function you just called.
It receives a session, a prompt, and a deadline.
It prints events and returns collected text.
:::

:::language nodejs
Replace the entire contents of `src/index.ts`:

<!-- code-id: museum-02-stream-the-curator-nodejs-1 -->
```typescript
import { CopilotClient } from "@github/copilot-sdk";
import { streamExhibit } from "./curator.js";

async function main(): Promise<void> {
  console.log("=== Museum Exhibit Studio ===");
  console.log();

  const client = new CopilotClient();
  try {
    await client.start();
    const session = await client.createSession({ availableTools: [],
      clientName: "museum-exhibit-studio",
      onPermissionRequest: () => ({ kind: "reject", feedback: "This session does not allow that permission request." }),
      streaming: true,
    });
    try {
      await streamExhibit(
        session,
        "Write two sentences of museum wall text about the Apollo 11 Moon landing.",
      );
    } finally {
      await session.disconnect();
    }
  } finally {
    await client.stop();
  }
}

void main();
```

The session setting `streaming: true` enables streaming.
`streamExhibit` replaces the completed-response call to `sendAndWait`.
Keep the empty tool list and permission handler from Step 1.

Open `src/curator.ts`.
Find `streamExhibit`, the supplied function you just called.
It receives a session, a prompt, and a deadline.
It prints events and returns collected text.
:::

:::language python
Replace the entire contents of `main.py`:

<!-- code-id: museum-02-stream-the-curator-python-1 -->
```python
import asyncio

from copilot import CopilotClient
from copilot.rpc import PermissionDecisionReject

from curator import stream_exhibit


async def main() -> None:
    print("=== Museum Exhibit Studio ===")
    print()

    async with CopilotClient() as client:
        async with await client.create_session(available_tools=[],
            client_name="museum-exhibit-studio",
            on_permission_request=lambda _request, _invocation: PermissionDecisionReject(feedback="This session does not allow that permission request."),
            streaming=True,
        ) as session:
            await stream_exhibit(
                session,
                "Write two sentences of museum wall text about the Apollo 11 Moon landing.",
            )


if __name__ == "__main__":
    asyncio.run(main())
```

The session setting `streaming=True` enables streaming.
`stream_exhibit` replaces the completed-response call to `send_and_wait`.
Keep the empty tool list and permission handler from Step 1.

Open `curator.py`.
Find `stream_exhibit`, the supplied function you just called.
It receives a session, a prompt, and a deadline.
It prints events and returns collected text.
:::

:::language go
Replace the entire contents of `main.go`:

<!-- code-id: museum-02-stream-the-curator-go-1 -->
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
		Streaming: copilot.Bool(true),
	})
	if err != nil {
		return err
	}
	defer func() { err = errors.Join(err, session.Disconnect()) }()

	if _, err := StreamExhibit(
		session,
		"Write two sentences of museum wall text about the Apollo 11 Moon landing.",
		GenerationTimeout,
	); err != nil {
		return err
	}
	return nil
}
```

The session setting `Streaming: copilot.Bool(true)` enables streaming.
`StreamExhibit` replaces the completed-response call to `SendAndWait`.
Keep the empty tool list and permission handler from Step 1.

Open `curator.go`.
Find `StreamExhibit`, the supplied function you just called.
It receives a session, a prompt, and a deadline.
It prints events and returns collected text.
:::

:::language rust
Replace the entire contents of `src/main.rs`:

<!-- code-id: museum-02-stream-the-curator-rust-1 -->
```rust
use github_copilot_sdk::permission;
use github_copilot_sdk::types::SessionConfig;
use github_copilot_sdk::{Client, ClientOptions};
use museum_exhibit_studio::{GENERATION_TIMEOUT, RuntimeError, stream_exhibit};

#[tokio::main]
async fn main() -> Result<(), RuntimeError> {
    println!("=== Museum Exhibit Studio ===");
    println!();

    let mut config = SessionConfig::default().with_permission_handler(permission::deny_all());
    config.client_name = Some("museum-exhibit-studio".to_owned());
    config.available_tools = Some(vec![]);
    config.streaming = Some(true);

    let client = Client::start(ClientOptions::default()).await?;
    let result = async {
        let session = client.create_session(config).await?;
        let response_result = async {
            stream_exhibit(
                &session,
                "Write two sentences of museum wall text about the Apollo 11 Moon landing.",
                GENERATION_TIMEOUT,
            )
            .await?;
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

The session setting `config.streaming = Some(true)` enables streaming.
`stream_exhibit` replaces the completed-response call to `send_and_wait`.
Keep the empty tool list and permission handler from Step 1.

Open `src/lib.rs`.
Find `stream_exhibit`, the supplied function you just called.
It receives a session, a prompt, and a deadline.
It prints events and returns collected text.
:::

:::language java
Replace the entire contents of `src/main/java/workshop/MuseumExhibitStudio.java`:

<!-- code-id: museum-02-stream-the-curator-java-1 -->
```java
package workshop;

import com.github.copilot.CopilotClient;
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
                        PermissionRequestResult.reject("This session does not allow unexpected permission requests.")))
                    .setStreaming(true);
            try (var session = client.createSession(config).get()) {
                CuratorStreamer.streamExhibit(session,
                        "Write two sentences of museum wall text about the Apollo 11 Moon landing.");
            }
        }
    }
}
```

The session setting `setStreaming(true)` enables streaming.
`CuratorStreamer.streamExhibit` replaces the completed-response call to `sendAndWait`.
Keep the empty tool list and permission handler from Step 1.

Open `src/main/java/workshop/CuratorStreamer.java`.
Find `CuratorStreamer.streamExhibit`, the supplied function you just called.
It receives a session, a prompt, and a deadline.
It prints events and returns collected text.
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

Look for text arriving before the request finishes.
The output can resemble this partial response:

<!-- code-id: museum-02-stream-the-curator-shared-1 -->
```text
=== Museum Exhibit Studio ===

In July 1969, three astronauts left Earth aboard Apollo 11... 
```

A short response may arrive too quickly to reveal separate chunks.
If all text appears at the end, check both the streaming setting and the helper call.
Output buffering or a fallback message can produce the same observation.
Use events as evidence rather than expecting fixed chunk sizes.

Once the request finishes, the process should exit.
Next we'll give the curator instructions about its audience and writing style.

## Check your understanding

Why do we need both the streaming setting and the supplied helper?

<details>
<summary>Check your answer</summary>

The setting requests events. The helper consumes them, prints text, retains the result, and handles completion or failure.

</details>

## Learn more

Optional reference: [Steering and queueing](https://github.com/github/copilot-sdk/blob/main/docs/features/steering-and-queueing.md).

Continue to [Give the curator a voice](museum-03-curator-voice.md).
