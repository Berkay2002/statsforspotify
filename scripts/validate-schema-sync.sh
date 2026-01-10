#!/usr/bin/env bash
# Validation script for Supabase schema sync workflow
# This script validates the workflow structure without running it

set -euo pipefail

echo "🔍 Validating Supabase Schema Sync Workflow..."
echo ""

# Check if workflow file exists
WORKFLOW_FILE=".github/workflows/sync-supabase-schema.yml"
if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "❌ Workflow file not found: $WORKFLOW_FILE"
    exit 1
fi
echo "✅ Workflow file exists"

# Check if schema directory exists
SCHEMA_DIR="supabase/schema"
if [ ! -d "$SCHEMA_DIR" ]; then
    echo "❌ Schema directory not found: $SCHEMA_DIR"
    exit 1
fi
echo "✅ Schema directory exists"

# Check if schema.sql placeholder exists
SCHEMA_FILE="$SCHEMA_DIR/schema.sql"
if [ ! -f "$SCHEMA_FILE" ]; then
    echo "❌ Schema file not found: $SCHEMA_FILE"
    exit 1
fi
echo "✅ Schema file exists"

# Check if documentation exists
DOCS=(
    "SCHEMA_SYNC.md"
    ".github/SECRETS_SETUP.md"
    ".github/README.md"
    "supabase/schema/README.md"
)

for doc in "${DOCS[@]}"; do
    if [ ! -f "$doc" ]; then
        echo "❌ Documentation file not found: $doc"
        exit 1
    fi
done
echo "✅ All documentation files exist"

# Validate YAML syntax (if yamllint is available)
if command -v yamllint &> /dev/null; then
    echo ""
    echo "📝 Validating YAML syntax..."
    # Only check for critical errors, ignore warnings about line length
    if yamllint -d "{extends: relaxed, rules: {line-length: disable}}" "$WORKFLOW_FILE" 2>&1 | grep -i "error"; then
        echo "❌ YAML validation failed"
        exit 1
    fi
    echo "✅ YAML syntax is valid"
fi

# Check for required secrets in workflow
echo ""
echo "🔐 Checking required secrets..."
REQUIRED_SECRETS=(
    "SUPABASE_ACCESS_TOKEN"
    "SUPABASE_PROJECT_ID"
    "SUPABASE_DB_PASSWORD"
)

for secret in "${REQUIRED_SECRETS[@]}"; do
    if ! grep -q "$secret" "$WORKFLOW_FILE"; then
        echo "❌ Required secret not found in workflow: $secret"
        exit 1
    fi
done
echo "✅ All required secrets are referenced in workflow"

# Check if workflow has required triggers
echo ""
echo "⏰ Checking workflow triggers..."
if ! grep -q "schedule:" "$WORKFLOW_FILE"; then
    echo "⚠️  Warning: No schedule trigger found"
fi

if ! grep -q "workflow_dispatch:" "$WORKFLOW_FILE"; then
    echo "⚠️  Warning: No manual trigger found"
fi

if grep -q "schedule:" "$WORKFLOW_FILE" && grep -q "workflow_dispatch:" "$WORKFLOW_FILE"; then
    echo "✅ Workflow has both scheduled and manual triggers"
fi

# Check if workflow commits only on changes
echo ""
echo "📦 Checking conditional commit logic..."
if grep -q "check_changes" "$WORKFLOW_FILE" && grep -q "git diff --staged --quiet" "$WORKFLOW_FILE"; then
    echo "✅ Conditional commit logic is present"
else
    echo "❌ Conditional commit logic not found or incomplete"
    exit 1
fi

# Validate .gitattributes for SQL files
echo ""
echo "📄 Checking .gitattributes..."
if [ -f ".gitattributes" ]; then
    if grep -q "*.sql" ".gitattributes"; then
        echo "✅ .gitattributes configured for SQL files"
    else
        echo "⚠️  Warning: .gitattributes doesn't include SQL files"
    fi
else
    echo "⚠️  Warning: .gitattributes file not found"
fi

echo ""
echo "================================"
echo "✅ All validation checks passed!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Configure GitHub secrets (see .github/SECRETS_SETUP.md)"
echo "2. Manually trigger the workflow from GitHub Actions UI"
echo "3. Verify the schema dump is correct"
echo "4. Set up scheduled runs (already configured in workflow)"
echo ""
