# Instructor notes: one local output file

Learner page: [Create an interactive exhibit page](../../workshop/museum-08-interactive-exhibit-page.md)
Deck: slide 7 only if you teach this optional extension. Use slide 8 to close either path.

## The final capability transition

The model can request a write within the HTML session. This session does not inherit the research tools or the generation fact tool.
Its allowlist contains only `builtin:apply_patch`, and its permission handler matches the exact `exhibit.html` path in the application working directory.

This is an HTML-writing role configured by the application and run through the Copilot CLI harness.
The SDK session supplies its conversation context. The built-in editing tool is a callable capability, not another agent.

This creates a local file. It does not deploy a website. The same filename in a different directory is not the same allowed target.

The draft enters the HTML prompt as source material. It remains model-generated and untrusted. A narrow write permission does not make embedded JavaScript safe or turn the draft into approved museum content.

## Permission and completion are different checks

The permission handler decides whether a requested action may proceed. Artifact verification checks the result after the session. The application captures prior file state and confirms only a new or content-changed nonempty regular file.

An unchanged earlier page, empty file, missing file, directory, or symbolic link must not produce a verified-update message. The application preserves previous output rather than deleting it to make the next run appear successful.

A model response saying "Created exhibit.html" is not sufficient evidence. It may be printed before the application's independent check reports failure. Keep that distinction visible when presenting a transcript.

## Optional second-file experiment

If time permits, save the original HTML prompt and ask for `notes.txt` too. The model may attempt the write, refuse without attempting it, or produce a batch that the handler rejects. A rejected batch may prevent the intended file as well.

Do not promise an exact refusal transcript or a successful exhibit update. A direct handler check with fixed requests is the deterministic way to exercise the rule.

Restore the original prompt before the next participant run.

## Review before opening

Have participants inspect the HTML source before opening it. Check the requested standalone structure, absence of unintended external requests, visible human-review caveat, and public sample content.

Then inspect the browser result: title, narrative, three questions, working text filter and result count, and visible keyboard focus. File-change verification proves none of those content or accessibility properties.

## Close with evidence

Use slide 8 for a short debrief. Ask one participant to name:

- A model choice they observed.
- A rule the application enforced.
- A result that still needed human review.

A strong explanation is more useful than another full demonstration. Remind the group that the workshop is a learning sample, not a production trust model.

Further reading: [local CLI setup](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/setup/local-cli.md) and [hook reference](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/hooks/README.md).
