---
on:
  workflow_dispatch:
  schedule: daily

permissions:
  contents: read
  issues: read
  pull-requests: read
  copilot-requests: write

engine: copilot
network: defaults

safe-outputs:
  create-issue:
    max: 1
    title-prefix: "[daily workshop validation] "
    deduplicate-by-title: true
  report-failure-as-issue: true
---

# Daily workshop validation

First, determine whether this repository changed during the preceding 26 hours:

```bash
git log --since="26 hours ago" --format="%H %s"
```

If that command returns no commits, stop immediately. Do not run validation commands,
do not create an issue, and do not request any other safe output.

If commits are present, validate the workshop from a fresh-user perspective:

1. Read the changed workshop documentation and related source files.
2. Run the existing non-interactive checks that are safe on a GitHub-hosted runner:
   - Build `samples/hello-copilot-sdk/hello-copilot-sdk.csproj`.
   - Build `samples/accessibility-report/accessibility-report.csproj`.
   - Build `src/BlazorApp/BlazorApp.csproj`.
   - Check the documented command paths, package versions, and workflow configuration
     statically.
3. Do not run interactive authentication, send Copilot prompts, launch a browser, or
   report a failure caused only by unavailable credentials, a browser runtime, an
   external service, or an organization-specific package proxy.
4. If all applicable checks pass, stop without creating an issue.
5. If a reproducible repository defect remains, create at most one issue through the
   safe output. Include the failing command or static check, expected and actual
   behavior, the affected commit SHA, and likely file locations. Search existing
   repository issues before requesting an issue and do not duplicate an existing
   report.

The `report-failure-as-issue` safe output must report unexpected workflow failures
as an issue. Keep all issue output factual and actionable.
