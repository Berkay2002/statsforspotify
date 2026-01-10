#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

echo "Running lint..."
bun lint

echo "Running build..."
bun run build

echo "OK"

