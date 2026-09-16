# Step 6: Prove the structure

> **Pace:** Self-paced

## What you'll build

Check whether the draft follows the educator's requested format.
Continue where you left off from Step 5. You'll retain the runner's returned text and pass it to the supplied validator.

The validator uses ordinary code to check the title, narrative length, three numbered questions, question marks, and selected prohibited vocabulary.
The same text receives the same result.
These **structural checks** do not prove factual accuracy.

The validator is a function with fixed rules, not an agent.

The report is advisory: a failed format check does not stop this editing workflow.
The educator still compares the draft with the approved facts.

## Wire the validator

The runner already returns the complete text.
Store that return value, call the validator, and print its report.
Keep the existing error handling around this work.

:::language dotnet
Open `Program.cs`. Capture the returned exhibit and print the report:

<!-- code-id: museum-06-prove-the-structure-dotnet-1 -->
```csharp
    Console.WriteLine();
    var exhibit = await RunSessionAsync(
        GenerationConfig(approvedFacts),
        BuildExhibitPrompt(),
        CuratorStreamer.GenerationTimeout);

    Console.WriteLine();
    Console.WriteLine(CuratorValidation.FormatValidation(CuratorValidation.ValidateExhibit(exhibit)));

    return 0;
```

`CuratorValidation` is already in the `MuseumExhibitStudio.Helpers` namespace you imported in
Step 2, so there is nothing new to add at the top of the file.

Open `Helpers/CuratorValidation.cs`.
Find `CuratorValidation.ValidateExhibit` and `CuratorValidation.FormatValidation`.
The first receives exhibit text and returns check results.
The second turns those results into the report you print.
:::

:::language nodejs
Open `src/index.ts`. Add `formatValidation` and `validateExhibit` to the helper
import, then capture the returned exhibit and print the report:

<!-- code-id: museum-06-prove-the-structure-nodejs-1 -->
```typescript
    console.log();
    const exhibit = await runSession(
      generationConfig(approvedFacts),
      buildExhibitPrompt(),
      generationTimeoutMs,
    );

    console.log();
    console.log(formatValidation(validateExhibit(exhibit)));
```

Open `src/curator.ts`.
Find `validateExhibit` and `formatValidation`.
The first receives exhibit text and returns check results.
The second turns those results into the report you print.
:::

:::language python
Open `main.py`. Add `format_validation` and `validate_exhibit` to the helper
import, then capture the returned exhibit and print the report:

<!-- code-id: museum-06-prove-the-structure-python-1 -->
```python
        print()
        exhibit = await run_session(
            generation_config(facts),
            build_exhibit_prompt(),
            GENERATION_TIMEOUT_SECONDS,
        )

        print()
        print(format_validation(validate_exhibit(exhibit)))
        return 0
```

Open `curator.py`.
Find `validate_exhibit` and `format_validation`.
The first receives exhibit text and returns check results.
The second turns those results into the report you print.
:::

:::language go
Open `main.go`. Capture the returned exhibit and print the report:

<!-- code-id: museum-06-prove-the-structure-go-1 -->
```go
	fmt.Println()
	exhibit, err := runSession(ctx, exhibitConfig, buildExhibitPrompt(), GenerationTimeout)
	if err != nil {
		return err
	}

	fmt.Println()
	fmt.Println(FormatValidation(ValidateExhibit(exhibit)))
	return nil
```

`FormatValidation` and `ValidateExhibit` live in `curator.go` in the same package, so there is no
import to add.

Open `curator.go`.
Find `ValidateExhibit` and `FormatValidation`.
The first receives exhibit text and returns check results.
The second turns those results into the report you print.
:::

:::language rust
Open `src/main.rs`. Add `format_validation` and `validate_exhibit` to the crate
import, then capture the returned exhibit and print the report:

<!-- code-id: museum-06-prove-the-structure-rust-1 -->
```rust
    println!();
    let exhibit = run_session(
        generation_config(&facts)?,
        build_exhibit_prompt(),
        GENERATION_TIMEOUT,
    )
    .await?;

    println!();
    println!("{}", format_validation(&validate_exhibit(&exhibit)));

    Ok(())
```

Open `src/lib.rs`.
Find `validate_exhibit` and `format_validation`.
The first receives exhibit text and returns check results.
The second turns those results into the report you print.
:::

:::language java
Open `src/main/java/workshop/MuseumExhibitStudio.java`. Capture the returned
exhibit and print the report:

<!-- code-id: museum-06-prove-the-structure-java-1 -->
```java
            System.out.println();
            String exhibit = runSession(
                    generationConfig(facts),
                    buildExhibitPrompt(),
                    CuratorStreamer.GENERATION_TIMEOUT);

            System.out.println();
            System.out.println(CuratorValidation.formatValidation(CuratorValidation.validateExhibit(exhibit)));
```

`CuratorValidation` sits in the same `workshop` package, so there is no import to add.

Open `src/main/java/workshop/CuratorValidation.java`.
Find `CuratorValidation.validateExhibit` and `CuratorValidation.formatValidation`.
The first receives exhibit text and returns check results.
The second turns those results into the report you print.
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

The exhibit streams as before, and then a verdict appears under it:

<!-- code-id: museum-06-prove-the-structure-shared-2 -->
```text
Structural checks passed.
- One level-one title: true
- Narrative section: true
- Narrative length: 126 words (within 100-140: true)
- Visitor questions section: true
- Numbered questions: 3 (exactly three: true)
- Every item is a question: true
- Prohibited vocabulary: none

Structural checks do not prove factual grounding. Unsupported claims require human review or a separate evaluator.
```

A failing run is informative too. For example, a narrative outside the requested word range would
produce a report like this:

<!-- code-id: museum-06-prove-the-structure-shared-3 -->
```text
Structural checks found issues:
- One level-one title: true
- Narrative section: true
- Narrative length: 163 words (within 100-140: false)
- Visitor questions section: true
- Numbered questions: 3 (exactly three: true)
- Every item is a question: true
- Prohibited vocabulary: none
  - The narrative must contain 100-140 words; found 163.

Structural checks do not prove factual grounding. Unsupported claims require human review or a separate evaluator.
```

The application still exits successfully when structural checks fail.
The report advises the educator instead of stopping an editing workflow.
A publication system could choose to reject a failing draft.
That would be an application rule, not a stronger prompt.

## Check a fixed example, then change one rule

Save your entrypoint outside the project before this experiment.
Temporarily replace only the exhibit-generation assignment with the fixed string below.
Keep the validation call after it.
This avoids a model call for the draft and makes its word count predictable.

:::language dotnet
<!-- code-id: museum-06-fixture-dotnet -->
```csharp
var exhibit = "# Test exhibit\n## Narrative\n"
    + string.Join(" ", Enumerable.Repeat("gallery", 110))
    + "\n## Visitor questions\n1. What do you notice?\n2. What would you ask?\n3. What might change?";
```
:::
:::language nodejs
<!-- code-id: museum-06-fixture-nodejs -->
```typescript
const exhibit = "# Test exhibit\n## Narrative\n"
  + "gallery ".repeat(110)
  + "\n## Visitor questions\n1. What do you notice?\n2. What would you ask?\n3. What might change?";
```
:::
:::language python
<!-- code-id: museum-06-fixture-python -->
```python
exhibit = ("# Test exhibit\n## Narrative\n" + "gallery " * 110
           + "\n## Visitor questions\n1. What do you notice?\n2. What would you ask?\n3. What might change?")
```
:::
:::language go
<!-- code-id: museum-06-fixture-go -->
```go
exhibit := "# Test exhibit\n## Narrative\n" + strings.Repeat("gallery ", 110) +
    "\n## Visitor questions\n1. What do you notice?\n2. What would you ask?\n3. What might change?"
```
Keep the `strings` import from Step 5.
Replace the generation assignment and its associated error check together.
This string assignment cannot return a generation error.
:::
:::language rust
<!-- code-id: museum-06-fixture-rust -->
```rust
let exhibit = format!(
    "# Test exhibit\n## Narrative\n{}\n## Visitor questions\n1. What do you notice?\n2. What would you ask?\n3. What might change?",
    "gallery ".repeat(110)
);
```
:::
:::language java
<!-- code-id: museum-06-fixture-java -->
```java
String exhibit = "# Test exhibit\n## Narrative\n" + "gallery ".repeat(110)
        + "\n## Visitor questions\n1. What do you notice?\n2. What would you ask?\n3. What might change?";
```
:::

1. Run the normal command. The fixed text passes.
2. Replace `gallery` with `terminal` in the repeated-word literal.
3. Predict the verdict, then run again. The vocabulary rule fails while the word count remains within its limit.
4. Restore `gallery`.
5. Remove the third question. Run again to check that the question-count rule fails.

### Try an independent rule

Restore all three questions. Make the third question identical to the first.
The supplied validator checks count and punctuation, not distinctness, so this example still passes.
That gap matters: visitors need three different questions, not the same question repeated.

In your entrypoint, add a separate check for duplicate question text.
Ignore surrounding spaces and letter case when comparing questions.
Keep the supplied helper unchanged.
Try your implementation before opening the explanation.

Check a distinct set, an exact duplicate, and a duplicate with different case or surrounding spaces.

<details>
<summary>Compare your approach</summary>

Extract the three numbered question texts, remove their numbering, normalize whitespace at the
ends and letter case, then compare the number of unique texts with the number of questions.
Checking whole numbered lines would miss duplicates because `1.` and `3.` differ. This extra
rule still cannot tell whether a question is thoughtful or factually supported.

</details>

Keep a copy of your practice change outside the project.
Restore the saved entrypoint, including real generation, before Step 7.
The practice rule is separate from the finished reference sample.

## Check your understanding

Can a draft pass the structural checks and still be wrong?

<details>
<summary>Check your answer</summary>

Yes. Format, length, and vocabulary checks do not establish factual grounding. The educator must compare the claims with approved facts.

</details>

## Learn more

Optional reference: [User prompt submitted hook](https://github.com/github/copilot-sdk/blob/main/docs/hooks/user-prompt-submitted.md).

Continue to [Research with Wikipedia MCP](museum-07-wikipedia-research.md).
