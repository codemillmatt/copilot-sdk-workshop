# Step 4: Ground it in approved facts

> **Pace:** Self-paced

## What you'll build

Let the educator select approved facts before requesting a draft.
Continue where you left off from Step 3. You'll register the supplied local tool and request a title, a 100-140-word narrative, and three visitor questions.

A **local tool** is a function in your application.
The model sees its description and argument schema, not its source code.
If the model requests it, the Copilot CLI harness invokes the application function and returns its result to the conversation.
The function is a capability of the curator agent, not another agent.

<figure class="museum-diagram">
  <img src="{{ASSET_BASE_URL}}museum-fact-tool.svg" width="600" height="685" alt="The educator selects facts. If the model requests approved_fact_lookup, the application returns that list. The Copilot CLI harness sends the result to the model for drafting. The educator still reviews the draft.">
  <figcaption>Follow the data from the educator to the function, then into the conversation. The model chooses whether to request the tool.</figcaption>
</figure>

`approved_fact_lookup` takes no arguments and returns the selected list.
The helper rejects empty input, more than 20 facts, or facts longer than 500 characters.
It skips permission for this public, read-only application data.
That policy would need reconsideration for sensitive data.

## Two settings and one request

`tools` registers the implementation. `availableTools` exposes its name through an explicit allowlist.
The prompt asks: Call `approved_fact_lookup` first.
That request does not guarantee a call.

The tool's result is deterministic for a given list. The model's draft is not.
Compare its claims with the facts, even after a successful call.
For a small list, putting facts directly in the prompt would also be reasonable.
This tool teaches data ownership and observable invocation.

## Register the tool and build the prompt

First, add these sentences after the audience and tone paragraph in your curator system message.
They name the source the educator approves:

<!-- code-id: museum-04-approved-facts-shared-1 -->
```text
Use only facts supplied by this application. Call the approved fact tool the
application provides and treat what it returns as the complete source of truth
for the current exhibit. Do not add facts from memory or outside knowledge.
```

Finish the following edits before running the application.
They connect the instructions, the tool, and its selected data.

:::language dotnet
Open `Program.cs`.
Keep `using MuseumExhibitStudio.Helpers;` at the top.
Keep the system message, including the facts guidance you just added.
Replace everything from the first `Console.WriteLine` through the end of the file with the following code:

<!-- code-id: museum-04-approved-facts-dotnet-1 -->
```csharp
Console.WriteLine("=== Museum Exhibit Studio ===");
Console.WriteLine();
Console.WriteLine("Approved fact sets:");
for (var index = 0; index < CuratorFacts.FactSets.Count; index++)
{
    Console.WriteLine($"{index + 1}. {CuratorFacts.FactSets[index].Label}");
}

Console.WriteLine();

var selectedFactSet = ReadFactSetSelection();
var approvedFacts = CuratorFacts.BoundFacts(selectedFactSet.Facts);
for (var index = 0; index < approvedFacts.Length; index++)
{
    Console.WriteLine($"{index + 1}. {approvedFacts[index]}");
}

Console.WriteLine();

if (!CuratorTerminal.AskYesNo("Use these facts?", defaultYes: true))
{
    approvedFacts = CuratorFacts.BoundFacts(CuratorTerminal.ReadFacts());
}

Console.WriteLine();

await using var client = new CopilotClient();
await client.StartAsync();

await using var session = await client.CreateSessionAsync(new SessionConfig
{
    ClientName = "museum-exhibit-studio",
    OnPermissionRequest = (_, _) => Task.FromResult(
        PermissionDecision.Reject("This session does not allow unexpected permission requests.")),
    Streaming = true,
    Tools = [CuratorFacts.CreateApprovedFactLookup(approvedFacts)],
    AvailableTools = [CuratorFacts.ApprovedFactLookupName],
    SystemMessage = new SystemMessageConfig
    {
        Mode = SystemMessageMode.Replace,
        Content = SystemMessage
    }
});

await CuratorStreamer.StreamExhibitAsync(session, BuildExhibitPrompt());

CuratorTerminal.CloseTerminal();

CuratorFactSet ReadFactSetSelection()
{
    var input = CuratorTerminal.AskLine("Choose a fact set [1-3, default 1]: ");
    if (int.TryParse(input, out var selection) &&
        selection >= 1 &&
        selection <= CuratorFacts.FactSets.Count)
    {
        return CuratorFacts.FactSets[selection - 1];
    }

    return CuratorFacts.FactSets[0];
}

static string BuildExhibitPrompt()
{
    return $"""
        Create visitor-facing exhibit text about this application's approved subject.

        Call {CuratorFacts.ApprovedFactLookupName} first. Use only the facts it returns, and
        treat them as the complete source of truth for this exhibit.

        Return exactly this structure:

        # <an engaging exhibit title>
        ## Narrative
        <100-140 words, excluding the title and questions>
        ## Visitor questions
        1. <question>
        2. <question>
        3. <question>

        Write exactly three distinct visitor reflection questions. Do not add a preface,
        conclusion, software discussion, or facts the tool did not return.
        """;
}
```

Open `Helpers/CuratorFacts.cs`.
Find `CuratorFacts.CreateApprovedFactLookup`, the supplied function that creates the local tool.
It receives the selected facts and calls `CuratorFacts.BoundFacts` to check their limits.
:::

:::language nodejs
Open `src/index.ts`.
Replace its import from `./curator.js` with this list of supplied functions:

<!-- code-id: museum-04-approved-facts-nodejs-1 -->
```typescript
import {
  approvedFactLookupName,
  askLine,
  askYesNo,
  boundFacts,
  closeTerminal,
  createApprovedFactLookup,
  factSets,
  readFacts,
  streamExhibit,
} from "./curator.js";
```

Add the prompt builder and the fact-set chooser below the system message:

<!-- code-id: museum-04-approved-facts-nodejs-2 -->
```typescript
function buildExhibitPrompt(): string {
  return `Create visitor-facing exhibit text about this application's approved subject.

Call ${approvedFactLookupName} first. Use only the facts it returns, and treat them as the
complete source of truth for this exhibit.

Return exactly this structure:

# <an engaging exhibit title>
## Narrative
<100-140 words, excluding the title and questions>
## Visitor questions
1. <question>
2. <question>
3. <question>

Write exactly three distinct visitor reflection questions. Do not add a preface,
conclusion, software discussion, or facts the tool did not return.`;
}

async function chooseFactSet(): Promise<(typeof factSets)[number]> {
  const answer = await askLine("Choose a fact set [1-3, default 1]: ");
  const choice = Number.parseInt(answer, 10);
  if (Number.isInteger(choice) && choice >= 1 && choice <= factSets.length) {
    return factSets[choice - 1] ?? factSets[0];
  }
  return factSets[0];
}
```

Replace `main` with:

<!-- code-id: museum-04-approved-facts-nodejs-3 -->
```typescript
async function main(): Promise<void> {
  try {
  console.log("=== Museum Exhibit Studio ===");
  console.log();
  console.log("Approved fact sets:");
  factSets.forEach((factSet, index) => console.log(`${index + 1}. ${factSet.label}`));
  console.log();

  const chosenSet = await chooseFactSet();
  let approvedFacts = boundFacts(chosenSet.facts);
  approvedFacts.forEach((fact, index) => console.log(`${index + 1}. ${fact}`));
  console.log();

  if (!(await askYesNo("Use these facts?", true))) {
    approvedFacts = boundFacts(await readFacts());
  }

  console.log();
  const client = new CopilotClient();
  try {
    await client.start();
    const session = await client.createSession({
      clientName: "museum-exhibit-studio",
      onPermissionRequest: () => ({ kind: "reject", feedback: "This session does not allow that permission request." }),
      streaming: true,
      tools: [createApprovedFactLookup(approvedFacts)],
      availableTools: [approvedFactLookupName],
      systemMessage: { mode: "replace", content: systemMessage },
    });
    try {
      await streamExhibit(session, buildExhibitPrompt());
    } finally {
      await session.disconnect();
    }
  } finally {
    await client.stop();
  }
  } finally {
    closeTerminal();
  }
}
```

Open `src/curator.ts`.
Find `createApprovedFactLookup`, the supplied function that creates the local tool.
It receives the selected facts and calls `boundFacts` to check their limits.
:::

:::language python
Open `main.py`.
Replace its import from `curator` with this list of supplied functions:

<!-- code-id: museum-04-approved-facts-python-1 -->
```python
from curator import (
    APPROVED_FACT_LOOKUP_NAME,
    FACT_SETS,
    ask_line,
    ask_yes_no,
    bound_facts,
    create_approved_fact_lookup,
    read_facts,
    stream_exhibit,
)
```

Add the prompt builder below `SYSTEM_MESSAGE`:

<!-- code-id: museum-04-approved-facts-python-2 -->
```python
def build_exhibit_prompt() -> str:
    return f"""Create visitor-facing exhibit text about this application's approved subject.

Call {APPROVED_FACT_LOOKUP_NAME} first. Use only the facts it returns, and treat them as
the complete source of truth for this exhibit.

Return exactly this structure:

# <an engaging exhibit title>
## Narrative
<100-140 words, excluding the title and questions>
## Visitor questions
1. <question>
2. <question>
3. <question>

Write exactly three distinct visitor reflection questions. Do not add a preface,
conclusion, software discussion, or facts the tool did not return."""
```

Replace `main`:

<!-- code-id: museum-04-approved-facts-python-3 -->
```python
async def main() -> None:
    print("=== Museum Exhibit Studio ===")
    print()
    print("Approved fact sets:")
    for index, fact_set in enumerate(FACT_SETS, start=1):
        print(f"{index}. {fact_set.label}")
    print()

    choice = ask_line("Choose a fact set [1-3, default 1]: ")
    selected_index = int(choice) - 1 if choice in {"1", "2", "3"} else 0
    facts = list(FACT_SETS[selected_index].facts)
    for index, fact in enumerate(facts, start=1):
        print(f"{index}. {fact}")
    print()

    if not ask_yes_no("Use these facts?", True):
        facts = read_facts()
    facts = bound_facts(facts)

    print()
    async with CopilotClient() as client:
        async with await client.create_session(
            client_name="museum-exhibit-studio",
            on_permission_request=lambda _request, _invocation: PermissionDecisionReject(feedback="This session does not allow that permission request."),
            streaming=True,
            tools=[create_approved_fact_lookup(facts)],
            available_tools=[APPROVED_FACT_LOOKUP_NAME],
            system_message={"mode": "replace", "content": SYSTEM_MESSAGE},
        ) as session:
            await stream_exhibit(session, build_exhibit_prompt())
```

Open `curator.py`.
Find `create_approved_fact_lookup`, the supplied function that creates the local tool.
It receives the selected facts and calls `bound_facts` to check their limits.
:::

:::language go
Open `main.go`.
Add `"strconv"` to the imports for parsing the educator's numbered choice.
Add the prompt builder below the system message:

<!-- code-id: museum-04-approved-facts-go-1 -->
```go
func buildExhibitPrompt() string {
	return fmt.Sprintf(`Create visitor-facing exhibit text about this application's approved subject.

Call %s first. Use only the facts it returns, and treat them as the complete
source of truth for this exhibit.

Return exactly this structure:

# <an engaging exhibit title>
## Narrative
<100-140 words, excluding the title and questions>
## Visitor questions
1. <question>
2. <question>
3. <question>

Write exactly three distinct visitor reflection questions. Do not add a preface,
conclusion, software discussion, or facts the tool did not return.`, ApprovedFactLookupName)
}
```

Replace the `main` wrapper and its `run` function together with the following code:

<!-- code-id: museum-04-approved-facts-go-2 -->
```go
func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() (err error) {
	fmt.Println("=== Museum Exhibit Studio ===")
	fmt.Println()
	fmt.Println("Approved fact sets:")
	for index, factSet := range FactSets {
		fmt.Printf("%d. %s\n", index+1, factSet.Label)
	}
	fmt.Println()

	choice := AskLine(fmt.Sprintf("Choose a fact set [1-%d, default 1]: ", len(FactSets)))
	selectedIndex := 0
	if parsed, err := strconv.Atoi(choice); err == nil && parsed >= 1 && parsed <= len(FactSets) {
		selectedIndex = parsed - 1
	}

	facts := append([]string(nil), FactSets[selectedIndex].Facts...)
	for index, fact := range facts {
		fmt.Printf("%d. %s\n", index+1, fact)
	}
	fmt.Println()

	if !AskYesNo("Use these facts?", true) {
		facts = ReadFacts()
	}
	facts, err = BoundFacts(facts)
	if err != nil {
		return err
	}

	lookup, err := ApprovedFactLookup(facts)
	if err != nil {
		return err
	}

	fmt.Println()
	ctx := context.Background()
	client := copilot.NewClient(&copilot.ClientOptions{LogLevel: "error"})
	defer func() { err = errors.Join(err, client.Stop()) }()
	if err := client.Start(ctx); err != nil {
		return err
	}

	session, err := client.CreateSession(ctx, &copilot.SessionConfig{
		ClientName: "museum-exhibit-studio",
		OnPermissionRequest: func(_ copilot.PermissionRequest, _ copilot.PermissionInvocation) (rpc.PermissionDecision, error) {
			return &rpc.PermissionDecisionReject{}, nil
		},
		Streaming:      copilot.Bool(true),
		Tools:          []copilot.Tool{lookup},
		AvailableTools: []string{ApprovedFactLookupName},
		SystemMessage: &copilot.SystemMessageConfig{
			Mode:    "replace",
			Content: systemMessage,
		},
	})
	if err != nil {
		return err
	}
	defer func() { err = errors.Join(err, session.Disconnect()) }()

	if _, err := StreamExhibit(session, buildExhibitPrompt(), GenerationTimeout); err != nil {
		return err
	}
	return nil
}
```

Open `curator.go`.
Find `ApprovedFactLookup`, the supplied function that creates the local tool.
It receives the selected facts and calls `BoundFacts` to check their limits.
:::

:::language rust
Open `src/main.rs`.
Replace the `museum_exhibit_studio` import with this list of supplied names:

<!-- code-id: museum-04-approved-facts-rust-1 -->
```rust
use museum_exhibit_studio::{
    APPROVED_FACT_LOOKUP_NAME, GENERATION_TIMEOUT, RuntimeError, approved_fact_lookup, ask_line,
    ask_yes_no, bound_facts, fact_sets, read_facts, stream_exhibit,
};
```

Add the prompt builder below `SYSTEM_MESSAGE`:

<!-- code-id: museum-04-approved-facts-rust-2 -->
```rust
fn build_exhibit_prompt() -> String {
    format!(
        r#"Create visitor-facing exhibit text about this application's approved subject.

Call {APPROVED_FACT_LOOKUP_NAME} first. Use only the facts it returns, and treat them as
the complete source of truth for this exhibit.

Return exactly this structure:

# <an engaging exhibit title>
## Narrative
<100-140 words, excluding the title and questions>
## Visitor questions
1. <question>
2. <question>
3. <question>

Write exactly three distinct visitor reflection questions. Do not add a preface,
conclusion, software discussion, or facts the tool did not return."#
    )
}
```

Replace `main`:

<!-- code-id: museum-04-approved-facts-rust-3 -->
```rust
#[tokio::main]
async fn main() -> Result<(), RuntimeError> {
    println!("=== Museum Exhibit Studio ===");
    println!();
    println!("Approved fact sets:");
    for (index, fact_set) in fact_sets().iter().enumerate() {
        println!("{}. {}", index + 1, fact_set.label);
    }
    println!();

    let choice = ask_line("Choose a fact set [1-3, default 1]: ")?;
    let selected_index = choice
        .trim()
        .parse::<usize>()
        .ok()
        .filter(|index| (1..=fact_sets().len()).contains(index))
        .unwrap_or(1)
        - 1;
    let mut facts = fact_sets()[selected_index]
        .facts
        .iter()
        .map(|fact| (*fact).to_owned())
        .collect::<Vec<_>>();
    for (index, fact) in facts.iter().enumerate() {
        println!("{}. {fact}", index + 1);
    }
    println!();

    if !ask_yes_no("Use these facts?", true)? {
        facts = read_facts()?;
    }
    let facts = bound_facts(facts)?;

    println!();
    let mut config = SessionConfig::default().with_permission_handler(permission::deny_all());
    config.client_name = Some("museum-exhibit-studio".to_owned());
    config.streaming = Some(true);
    config.tools = Some(vec![approved_fact_lookup(&facts)?]);
    config.available_tools = Some(vec![APPROVED_FACT_LOOKUP_NAME.to_owned()]);
    config.system_message = Some(
        SystemMessageConfig::new()
            .with_mode("replace")
            .with_content(SYSTEM_MESSAGE),
    );

    let client = Client::start(ClientOptions::default()).await?;
    let result = async {
        let session = client.create_session(config).await?;
        let response_result = async {
            stream_exhibit(&session, build_exhibit_prompt(), GENERATION_TIMEOUT).await?;
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

Open `src/lib.rs`.
Find `approved_fact_lookup`, the supplied function that creates the local tool.
It receives the selected facts and calls `bound_facts` to check their limits.
:::

:::language java
Open `src/main/java/workshop/MuseumExhibitStudio.java`.
Keep the `java.util.List` import from the earlier lesson.
Add the prompt builder and fact-selection method inside the class, after the system message:

<!-- code-id: museum-04-approved-facts-java-1 -->
```java
    public static String buildExhibitPrompt() {
        return """
                Create visitor-facing exhibit text about this application's approved subject.

                Call %s first. Use only the facts it returns, and treat them as the
                complete source of truth for this exhibit.

                Return exactly this structure:

                # <an engaging exhibit title>
                ## Narrative
                <100-140 words, excluding the title and questions>
                ## Visitor questions
                1. <question>
                2. <question>
                3. <question>

                Write exactly three distinct visitor reflection questions. Do not add a preface,
                conclusion, software discussion, or facts the tool did not return.
                """.formatted(CuratorFacts.APPROVED_FACT_LOOKUP_NAME);
    }

    private static CuratorFacts.FactSet selectFactSet(String input) {
        if (input != null && !input.isBlank()) {
            try {
                int selected = Integer.parseInt(input.trim());
                if (selected >= 1 && selected <= CuratorFacts.factSets.size()) {
                    return CuratorFacts.factSets.get(selected - 1);
                }
            } catch (NumberFormatException ignored) {
            }
        }
        return CuratorFacts.factSets.get(0);
    }
```

Replace `main`:

<!-- code-id: museum-04-approved-facts-java-2 -->
```java
    public static void main(String[] args) throws Exception {
        System.out.println("=== Museum Exhibit Studio ===");
        System.out.println();
        System.out.println("Approved fact sets:");
        for (int index = 0; index < CuratorFacts.factSets.size(); index++) {
            System.out.printf("%d. %s%n", index + 1, CuratorFacts.factSets.get(index).label());
        }
        System.out.println();

        CuratorFacts.FactSet selected =
                selectFactSet(CuratorTerminal.askLine("Choose a fact set [1-3, default 1]: "));
        List<String> facts = selected.facts();
        for (int index = 0; index < facts.size(); index++) {
            System.out.printf("%d. %s%n", index + 1, facts.get(index));
        }
        System.out.println();

        if (!CuratorTerminal.askYesNo("Use these facts?", true)) {
            facts = CuratorTerminal.readFacts();
        }
        facts = CuratorFacts.boundFacts(facts);

        System.out.println();
        try (var client = new CopilotClient()) {
            client.start().get();
            try (var session = client.createSession(new SessionConfig()
                    .setClientName("museum-exhibit-studio")
                    .setOnPermissionRequest((request, ignored) -> CompletableFuture.completedFuture(
                        PermissionRequestResult.reject("This session does not allow unexpected permission requests.")))
                    .setStreaming(true)
                    .setTools(List.of(CuratorFacts.approvedFactLookup(facts)))
                    .setAvailableTools(List.of(CuratorFacts.APPROVED_FACT_LOOKUP_NAME))
                    .setSystemMessage(new SystemMessageConfig()
                            .setMode(SystemMessageMode.REPLACE)
                            .setContent(SYSTEM_MESSAGE))).get()) {
                CuratorStreamer.streamExhibit(session, buildExhibitPrompt());
            }
        } finally {
            CuratorTerminal.close();
        }
    }
```

Open `src/main/java/workshop/CuratorFacts.java`.
Find `CuratorFacts.approvedFactLookup`, the supplied function that creates the local tool.
It receives the selected facts and calls `CuratorFacts.boundFacts` to check their limits.
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

Choose a fact set when the application asks.
Review the printed facts and accept them for this run.
The following example shows a tool call followed by a draft:

<!-- code-id: museum-04-approved-facts-shared-2 -->
```text
=== Museum Exhibit Studio ===

Approved fact sets:
1. Apollo 11
2. Great Barrier Reef
3. Terracotta Army

Choose a fact set [1-3, default 1]: 2
1. The Great Barrier Reef lies off the coast of Queensland, Australia.
2. It stretches for about 2,300 kilometres.
3. It is made up of more than 2,900 individual reefs.
4. It was added to the UNESCO World Heritage List in 1981.
5. Rising sea temperatures have caused repeated coral bleaching events.

Use these facts? [Y/n]: y

[tool:start] approved_fact_lookup
[tool:done] success=true

# A Reef the Size of a Country
## Narrative
Off the Queensland coast, more than two thousand nine hundred reefs...
## Visitor questions
1. ...
```

The `[tool:start] approved_fact_lookup` line identifies a requested call.
The completion line reports its result.
These events distinguish a retrieved list from a plausible answer that used no tool.

## Compare the tool result with the draft

Run again with another supplied fact set.
The prompt stays the same, but the tool now holds different data.
Look for a tool call and compare each draft with the selected list.
If the model does not call the tool, do not treat its draft as evidence that retrieval worked.

To try another subject, answer `n` at the confirmation.
Enter two or three public sample facts, then submit a blank line.
Check the returned subject and claims against your input.

For the input failure case, answer `n` and submit a blank line without entering facts.
The application reports `Provide at least one approved fact.`
It rejects the empty list before sending a generation request.
Step 5 gives these failures a consistent reporting path.

## Check your understanding

Which setting registers the tool, which exposes it, and which asks the model to use it?

<details>
<summary>Check your answer</summary>

The tool list registers its implementation. The allowlist exposes its name. The prompt requests a call but does not guarantee one.

</details>

## Learn more

Optional reference: [Working with hooks](https://github.com/github/copilot-sdk/blob/main/docs/features/hooks.md).

Continue to [Set the guardrails](museum-05-guardrails.md).
