#!/bin/bash

# Test script to validate Supabase connection and secrets
# This simulates what the GitHub Actions workflow does

set -euo pipefail

echo "🔍 Testing Supabase connection and schema sync..."
echo ""

# Check for required environment variables
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "❌ Error: SUPABASE_ACCESS_TOKEN is not set"
  exit 1
fi

if [ -z "${SUPABASE_PROJECT_ID:-}" ]; then
  echo "❌ Error: SUPABASE_PROJECT_ID is not set"
  exit 1
fi

if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  echo "❌ Error: SUPABASE_DB_PASSWORD is not set"
  exit 1
fi

echo "✅ All required environment variables are set"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "📦 Supabase CLI not found. Installing..."
  # Installation varies by OS - provide instructions
  echo "Please install Supabase CLI first:"
  echo "  - macOS: brew install supabase/tap/supabase"
  echo "  - Linux/WSL: Visit https://supabase.com/docs/guides/cli"
  exit 1
fi

echo "✅ Supabase CLI installed: $(supabase --version)"
echo ""

# Test database connection
echo "🔌 Testing database connection..."
ENCODED_PASSWORD=$(bun -e 'process.stdout.write(encodeURIComponent(process.env.SUPABASE_DB_PASSWORD))')
DB_URL="postgresql://postgres:${ENCODED_PASSWORD}@db.${SUPABASE_PROJECT_ID}.supabase.co:5432/postgres"

# Create test directory
TEST_DIR=$(mktemp -d "${TMPDIR:-/tmp}/statsforspotify-connection.XXXXXX")
trap 'rm -f -- "$TEST_DIR/schema.sql" "$TEST_DIR/database.ts" "$TEST_DIR/dump-error.log" "$TEST_DIR/types-error.log"; rmdir -- "$TEST_DIR"' EXIT

# Try to dump schema (to temp location)
echo "📥 Attempting to dump schema..."
if supabase db dump --db-url "$DB_URL" --data-only=false > "$TEST_DIR/schema.sql" 2> "$TEST_DIR/dump-error.log"; then
  echo "✅ Schema dump successful!"
  echo "   Schema size: $(wc -l < "$TEST_DIR/schema.sql") lines"
else
  echo "❌ Schema dump failed!"
  exit 1
fi
echo ""

# Try to generate TypeScript types
echo "🔧 Attempting to generate TypeScript types..."
if supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > "$TEST_DIR/database.ts" 2> "$TEST_DIR/types-error.log"; then
  echo "✅ TypeScript types generation successful!"
  echo "   Types file size: $(wc -l < "$TEST_DIR/database.ts") lines"
else
  echo "❌ TypeScript types generation failed!"
  exit 1
fi
echo ""

# The trap removes only the unique temporary directory created by this run.

echo "Connection, schema dump, and type generation passed. This does not test the GitHub push step."
echo ""
echo "📝 Next steps:"
echo "   1. Merge this PR to main"
echo "   2. The workflow will appear in the Actions tab"
echo "   3. Manually trigger it from Actions → Sync Supabase Schema → Run workflow"
echo "   4. Or wait for the daily scheduled run at 2 AM UTC"
