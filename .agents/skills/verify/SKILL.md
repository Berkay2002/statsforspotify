---
name: verify
description: Run lint and build to validate changes before marking work as done
---

Run the following checks in sequence. Stop at the first failure and fix it before continuing.

1. **Lint**: `bun run lint`
2. **Build**: `bun run build`

If both pass, report success. If either fails, analyze the error, fix it, and re-run the failing step.
