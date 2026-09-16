# Instructor notes: structural checks

Learner page: [Prove the structure](../../workshop/museum-06-prove-the-structure.md)
Deck: continue the slide 5 discussion only if needed. Otherwise circulate while learners test.

## What the validator proves

The supplied validator checks one title, the narrative section and its word range, three numbered questions with question marks, and selected prohibited vocabulary. It uses ordinary code, so the same input produces the same result.

The validator is not an agent. It applies fixed rules without calling a model.

It does not prove factual grounding, prose quality, thoughtful questions, or full compliance with every instruction in the prompt. Participants should name those omissions rather than treating a green report as approval to publish.

In particular, the prompt requests distinct questions, but the baseline validator checks count and punctuation rather than semantic or exact distinctness. That gap is intentional practice material, not a reason to claim the baseline validates more than it does.

## Why failure is advisory

The application prints a report for an educator editing a draft. It does not turn a structural failure into a process failure. A publishing pipeline could choose to block on those checks, but that is a different application policy.

Do not silently change this behavior during a demonstration. Participants must distinguish a failed model request, blank output, and a completed draft that violates the requested format.

## Use the fixed fixture

The repeated-word fixture removes model variability from the structural test. Changing `gallery` to `terminal` preserves the word count while triggering the vocabulary rule. Removing the third question isolates the count rule.

This teaches a useful testing habit: change one factor and inspect the result that should change. It is more informative than repeatedly generating until a narrative happens to exceed the word limit.

The vocabulary rule can also flag legitimate museum contexts, such as an airport terminal. Discuss it as a deliberately narrow sample rule, not a universally valid classifier for museum content.

## Independent practice and debrief

Ask participants to add a separate duplicate-question check in their entrypoint. It should remove numbering, trim surrounding whitespace, and compare text without case differences. Checking full numbered lines would miss duplicates because the numbers differ.

A string-equality rule still cannot judge whether two differently worded questions ask the same thing. That requires a broader evaluation strategy. Keep the task small enough that participants can complete it without a new framework.

Before Step 7, save the practice work outside the project and restore the baseline entrypoint. The supplied curator helper remains unchanged. Avoid using a repository reset as the restoration mechanism.

## Check understanding

Ask a participant to supply a draft that passes the format checks but contains an unsupported claim. They need not call a model to demonstrate that possibility. Then ask where a human or separate evaluator would fit.

Further reading: [hooks](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/hooks/hooks-overview.md). Hooks can place checks at lifecycle points, but a hook's existence does not make a check factual.
