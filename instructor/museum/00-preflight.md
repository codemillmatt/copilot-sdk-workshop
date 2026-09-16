# Instructor notes: preflight

Learner page: [Meet the project and prepare](../../workshop/museum-00-preflight.md)

## Establish the job before naming the technology

The learner builds software for a museum education team. An educator approves facts about a subject and needs a draft with a title, a 100-140-word narrative, and three visitor questions. The educator is the decision maker. The model is a drafting aid.

Avoid opening with "non-SDLC." If someone asks, SDLC means software development life cycle. The application is software, but the agent's assigned task is museum writing, not developing software. This contrast broadens the participant's model of what the Copilot SDK can support.

Use the word **curator** consistently for the agent in the sample. Do not imply that it replaces a professional curator's judgment. The educator still decides what evidence is approved and whether any generated claim is supported.

## What participants receive

The starter supplies fact sets, a bounded fact tool, streaming output, terminal questions, structural validation, research permissions, and file checks. These are application helpers, not capabilities that every SDK project receives automatically.

Learners write the instructions, prompt builders, session configuration, lifecycle runner, and code connecting the pieces. This is a useful teaching boundary: they touch the SDK while avoiding unrelated interface and parser work. In their next application they must build, adapt, or choose those supporting components.

## Rehearsal checklist

| Dependency | Instructor check | What it does not prove |
|---|---|---|
| Selected language toolchain | Its documented version and the starter build work. | A build does not check sign-in or account access for Copilot CLI. |
| Copilot CLI and account | The Copilot CLI is installed and the intended account has access. | Signing in does not grant arbitrary tool permissions. |
| Package sources | Pinned dependencies restore without editing manifests. | A successful restore is not a working model request. |
| Node.js/npm/npx | Wikipedia's separate program can be resolved. | Package metadata access is not successful research. |
| Browser/projector | Learner pages, diagrams, and code fit at usable zoom. | A readable page does not establish a completed exercise. |

The .NET path needs the SDK, not only the runtime. Java needs a JDK and Maven. Python uses the `.venv` interpreter explicitly. Go must run the package with `go run .`, not only `main.go`, so the helper file participates. Rust's helper crate lives in `src/lib.rs`.

Every language also needs Node.js for the Wikipedia MCP process. Explain this as a second program's requirement, not as a replacement for the selected language runtime.

## Protect the room's data and work

Use public sample facts. Prompts and tool results can reach the configured model service and consume account usage. A local function can return text that later leaves the machine.

Run one application instance per starter directory. Keep backup source outside that project so the compiler does not include duplicate entrypoints. Save participant work before comparing or restoring a named file. Never recommend a repository-wide reset or delete untracked files.

If a machine is blocked, separate the failure into installation, package access, account access, and runtime behavior. Let the participant pair with someone or use a labeled recorded demonstration while the setup problem is investigated. Do not solve access trouble by enabling broad permissions.

## Opening cue

Use slides 1-3 only after preflight. Say what the educator receives, distinguish the curator agent from the SDK, model, and Copilot CLI harness, then send learners to Step 1. Do not project every package installation unless the event was scheduled as an installation lab.
