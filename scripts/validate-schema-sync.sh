#!/usr/bin/env bash
# Compatibility entry point; the maintained validator also runs on Windows.
set -euo pipefail
exec bun run scripts/validate-schema-sync.ts
