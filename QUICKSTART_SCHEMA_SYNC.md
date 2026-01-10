# Quick Start: Supabase Schema Automation

This guide will help you set up the automated schema synchronization for this repository.

## Prerequisites

- Repository admin access (to add secrets)
- Supabase project with database
- 10 minutes to complete setup

## Setup Steps

### Step 1: Obtain Supabase Credentials

You need three pieces of information from your Supabase project:

1. **Access Token** - For Supabase API
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Click your profile icon → Account Settings → Access Tokens
   - Click "Generate New Token"
   - Name it "GitHub Actions Schema Sync"
   - Copy and save the token securely

2. **Project ID** - Your project identifier
   - In Supabase Dashboard, select your project
   - Go to Project Settings
   - Find the "Reference ID" (or check URL: `project/YOUR_ID_HERE`)
   - Example: `abcd1234efgh5678`

3. **Database Password** - For direct database access
   - In Supabase Dashboard, go to Project Settings → Database
   - Scroll to "Connection String"
   - If you don't have the password, click "Reset Database Password"
   - Copy and save the password securely

### Step 2: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** tab
3. Navigate to **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add these three secrets:

   | Name | Value |
   |------|-------|
   | `SUPABASE_ACCESS_TOKEN` | (Your access token from Step 1.1) |
   | `SUPABASE_PROJECT_ID` | (Your project ID from Step 1.2) |
   | `SUPABASE_DB_PASSWORD` | (Your database password from Step 1.3) |

   For each secret:
   - Click "New repository secret"
   - Enter the exact name from the table
   - Paste the value
   - Click "Add secret"

### Step 3: Test the Workflow

⚠️ **Important**: The workflow will only appear in the Actions tab AFTER this branch is merged to main. GitHub Actions workflows must be on the default branch to be manually triggered.

#### Before Merging (Test Secrets Locally)

You can test that your secrets are correctly configured:

```bash
# Set environment variables (use your actual secrets)
export SUPABASE_ACCESS_TOKEN="your-token-here"
export SUPABASE_PROJECT_ID="your-project-id"
export SUPABASE_DB_PASSWORD="your-db-password"

# Run the test script
./scripts/test-supabase-connection.sh
```

If all tests pass ✅, your secrets are configured correctly!

#### After Merging (Manual Trigger)

Once this PR is merged to main:

1. Go to **Actions** tab in your repository
2. Find **Sync Supabase Schema** in the workflows list
3. Click on it
4. Click **Run workflow** button (top right)
5. Select your branch (usually `main`)
6. Click **Run workflow** to start

The workflow will take 1-2 minutes to complete.

### Step 4: Verify Success

After the workflow completes:

1. Check the workflow run logs for any errors
2. Look for a new commit with message: `chore: sync Supabase schema [automated]`
3. Open `supabase/schema/schema.sql` - it should contain your database schema
4. Check `lib/supabase/database.ts` - it should have updated types

✅ If you see the schema and types, setup is complete!

## What Happens Next

The workflow will now run automatically:

- **Daily at 2 AM UTC** - Checks for schema changes
- **On manual trigger** - Whenever you run it from GitHub Actions
- **Commits only on changes** - Won't create empty commits

You'll see automated commits whenever the database schema changes.

## Troubleshooting

### Workflow Fails with Authentication Error

**Problem**: `Authentication failed` or `Connection refused`

**Solution**:
1. Verify all three secrets are added correctly
2. Check that the database is not paused (Supabase free tier)
3. Try resetting the database password and updating the secret
4. Ensure the access token hasn't expired

### Schema File is Empty

**Problem**: `schema.sql` is empty or very small

**Solution**:
1. Check workflow logs for errors
2. Verify your database has tables
3. Ensure Supabase CLI can connect (check DB URL format)

### TypeScript Types Not Generated

**Problem**: `database.ts` hasn't changed

**Solution**:
1. Verify `SUPABASE_ACCESS_TOKEN` is correct
2. Check if the token has necessary permissions
3. Try generating a new access token

### Need Help?

1. Read [SCHEMA_SYNC.md](../SCHEMA_SYNC.md) for detailed documentation
2. Check [.github/SECRETS_SETUP.md](.github/SECRETS_SETUP.md) for secret configuration
3. Review workflow logs in GitHub Actions for specific errors

## Local Validation

Before running the workflow, you can validate the setup locally:

```bash
# Run validation script
./scripts/validate-schema-sync.sh
```

This checks that all files are in place and the workflow structure is correct.

## Next Steps After Setup

1. **Review the first schema dump** - Check that it captured everything
2. **Set up notifications** - Configure GitHub to notify you of workflow failures
3. **Document any environment-specific setup** - If using multiple Supabase projects
4. **Share this guide** - Ensure team members understand the system

## Regular Maintenance

- **Monthly**: Review accumulated schema changes
- **Quarterly**: Rotate access tokens for security
- **When onboarding**: Show new team members this guide

## Summary

You've successfully set up automated schema synchronization! The repository will now always reflect your Supabase database schema, with all changes tracked in Git.

**Key files to know:**
- `supabase/schema/schema.sql` - Complete schema dump
- `lib/supabase/database.ts` - TypeScript types
- `SCHEMA_SYNC.md` - Full documentation

**Important reminder:** Never edit `schema.sql` or `database.ts` manually - they are auto-generated!
