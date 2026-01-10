#!/bin/bash

# Test script to validate Supabase connection and secrets
# This simulates what the GitHub Actions workflow does

set -e

echo "🔍 Testing Supabase connection and schema sync..."
echo ""

# Check for required environment variables
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ Error: SUPABASE_ACCESS_TOKEN is not set"
  exit 1
fi

if [ -z "$SUPABASE_PROJECT_ID" ]; then
  echo "❌ Error: SUPABASE_PROJECT_ID is not set"
  exit 1
fi

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
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
DB_URL="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${SUPABASE_PROJECT_ID}.supabase.co:5432/postgres"

# Create test directory
mkdir -p /tmp/supabase-test

# Try to dump schema (to temp location)
echo "📥 Attempting to dump schema..."
if supabase db dump --db-url "$DB_URL" --data-only=false > /tmp/supabase-test/schema.sql 2>&1; then
  echo "✅ Schema dump successful!"
  echo "   Schema size: $(wc -l < /tmp/supabase-test/schema.sql) lines"
else
  echo "❌ Schema dump failed!"
  exit 1
fi
echo ""

# Try to generate TypeScript types
echo "🔧 Attempting to generate TypeScript types..."
if supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > /tmp/supabase-test/database.ts 2>&1; then
  echo "✅ TypeScript types generation successful!"
  echo "   Types file size: $(wc -l < /tmp/supabase-test/database.ts) lines"
else
  echo "❌ TypeScript types generation failed!"
  exit 1
fi
echo ""

# Cleanup
rm -rf /tmp/supabase-test

echo "🎉 All tests passed! The workflow should work correctly."
echo ""
echo "📝 Next steps:"
echo "   1. Merge this PR to main"
echo "   2. The workflow will appear in the Actions tab"
echo "   3. Manually trigger it from Actions → Sync Supabase Schema → Run workflow"
echo "   4. Or wait for the daily scheduled run at 2 AM UTC"
