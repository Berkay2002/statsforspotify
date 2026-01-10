# GitHub Actions Secrets Setup

This document explains how to configure the required secrets for GitHub Actions workflows.

## Required Secrets for Schema Sync

The `sync-supabase-schema` workflow requires three secrets:

### 1. SUPABASE_ACCESS_TOKEN

**What it is**: Personal access token for Supabase API

**How to obtain**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click on your profile icon (top right)
3. Select **Account Settings**
4. Go to **Access Tokens** tab
5. Click **Generate New Token**
6. Give it a name (e.g., "GitHub Actions Schema Sync")
7. Copy the token (you won't see it again!)

**Permissions needed**: Read access to project schema

### 2. SUPABASE_PROJECT_ID

**What it is**: Your Supabase project identifier

**How to obtain**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Look for **Reference ID** or check the project URL
5. Example: If URL is `https://app.supabase.com/project/abcd1234`, the ID is `abcd1234`

**Note**: This is NOT a secret, but we store it as one for consistency

### 3. SUPABASE_DB_PASSWORD

**What it is**: Database password for direct PostgreSQL connection

**How to obtain**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Project Settings** → **Database**
4. Scroll to **Connection String** section
5. Click **Reset Database Password** if needed
6. Copy the password shown

**Warning**: Keep this secure! It provides full database access.

## Adding Secrets to GitHub

### For Repository Secrets

1. Go to your GitHub repository
2. Click **Settings** tab
3. Navigate to **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Enter the secret name (exactly as shown above)
6. Paste the value
7. Click **Add secret**

Repeat for all three secrets.

### For Organization Secrets (Optional)

If managing multiple repositories:

1. Go to GitHub Organization Settings
2. Navigate to **Secrets and variables** → **Actions**
3. Click **New organization secret**
4. Add the secret and select which repositories can access it

## Verifying Secrets

After adding secrets, verify they work:

1. Go to **Actions** tab in your repository
2. Select **Sync Supabase Schema** workflow
3. Click **Run workflow**
4. Choose the branch (usually `main`)
5. Click **Run workflow** button
6. Monitor the workflow run for any errors

If the workflow completes successfully, secrets are configured correctly!

## Troubleshooting

### "Authentication failed" error

- **Check**: `SUPABASE_ACCESS_TOKEN` is correct and not expired
- **Solution**: Regenerate token in Supabase Dashboard

### "Connection refused" error

- **Check**: `SUPABASE_DB_PASSWORD` is correct
- **Check**: `SUPABASE_PROJECT_ID` matches your project
- **Solution**: Reset password and update the secret

### "Permission denied" error

- **Check**: Access token has necessary permissions
- **Solution**: Generate new token with correct scopes

### Database is paused

- **Check**: Supabase free tier auto-pauses after inactivity
- **Solution**: Wake up the database in Supabase Dashboard, then re-run workflow

## Security Best Practices

✅ **DO**:
- Rotate secrets periodically (every 90 days)
- Use separate tokens for different workflows
- Revoke tokens that are no longer needed
- Monitor workflow logs for suspicious activity

❌ **DON'T**:
- Share secrets in chat, email, or documents
- Commit secrets to the repository
- Use production secrets in development
- Grant more permissions than necessary

## Multiple Environments

If syncing from multiple Supabase projects (dev/prod):

1. Create separate secrets with suffixes:
   - `SUPABASE_ACCESS_TOKEN_PROD`
   - `SUPABASE_PROJECT_ID_PROD`
   - `SUPABASE_DB_PASSWORD_PROD`

2. Create separate workflows or use environment-based logic

3. Document which environment each workflow syncs

## Secret Rotation

When rotating secrets:

1. Generate new token/password in Supabase
2. Update the GitHub secret with new value
3. Test the workflow to verify it works
4. Revoke the old token in Supabase
5. Document the rotation in team notes

## Questions?

If you need help setting up secrets:

1. Check this document first
2. Review [Supabase documentation](https://supabase.com/docs)
3. Check [GitHub Actions secrets docs](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
4. Reach out to the team for assistance
