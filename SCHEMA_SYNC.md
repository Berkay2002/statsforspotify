# Supabase Schema Synchronization

This document explains how database schema synchronization works in this repository and how to respond to schema drift.

## Overview

The database schema is treated as code and automatically synchronized from Supabase to this repository. This ensures:

- **Version control**: All schema changes are tracked in Git
- **Visibility**: Schema drift is immediately visible in pull requests
- **Reproducibility**: The schema can be recreated from the SQL files
- **Type safety**: TypeScript types are automatically regenerated

## How It Works

### Automated Synchronization

A GitHub Actions workflow (`.github/workflows/sync-supabase-schema.yml`) runs:

- **Daily at 2 AM UTC** (scheduled via cron)
- **On-demand** (manually triggered via GitHub Actions UI)

The workflow:

1. Connects to Supabase using secure credentials
2. Dumps the complete database schema (tables, types, functions, triggers, indexes, RLS policies)
3. Generates TypeScript types from the schema
4. Commits changes only if the schema has actually changed
5. Pushes the commit to the repository

### What Gets Synchronized

**Schema file** (`supabase/schema/schema.sql`):
- All tables, columns, and constraints
- Custom types and enums
- Database functions and triggers
- Indexes and performance optimizations
- Row Level Security (RLS) policies
- Grants and permissions

**TypeScript types** (`lib/supabase/database.ts`):
- Auto-generated type definitions for all tables
- Insert, Update, and Row types for type-safe queries
- Enum types from the database

### What Doesn't Get Synchronized

- **Data**: No actual table data is included (schema-only)
- **Secrets**: No passwords, API keys, or connection strings
- **Internal Supabase tables**: System tables are excluded

## Multiple Environments

### Development vs Production

The workflow can be configured for different environments:

1. **Single environment** (default): Syncs from one Supabase project
2. **Multiple environments**: Create separate workflows or use branch-based logic

To add a production sync:

```yaml
# .github/workflows/sync-supabase-schema-prod.yml
on:
  schedule:
    - cron: '0 3 * * *'  # Different time than dev
  workflow_dispatch:

# Use different secrets:
# - SUPABASE_PROJECT_ID_PROD
# - SUPABASE_DB_PASSWORD_PROD
```

### Current Configuration

This repository currently syncs from: **Development/Staging environment**

## Required Secrets

The workflow requires these GitHub secrets (configured in repository settings):

| Secret | Description | How to Obtain |
|--------|-------------|---------------|
| `SUPABASE_ACCESS_TOKEN` | Personal access token | Supabase Dashboard → Account → Access Tokens |
| `SUPABASE_PROJECT_ID` | Project identifier | From your Supabase project URL |
| `SUPABASE_DB_PASSWORD` | Database password | Supabase Dashboard → Project Settings → Database → Connection Info |

### Setting Up Secrets

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each of the three secrets above

## Responding to Schema Drift

### When You See a Schema Sync Commit

A commit message like `chore: sync Supabase schema [automated]` means:

✅ **Normal operation** - Someone made changes in Supabase Dashboard or via migrations
- Review the changes in the commit diff
- Verify the changes are expected
- Merge the automated PR if changes look correct

### When Schema Changes Are Unexpected

❌ **Unexpected changes** might indicate:

1. **Accidental changes**: Someone modified the database unintentionally
2. **Missing migration**: Changes were made without a corresponding migration file
3. **Security issue**: Unauthorized access to the database

**Action steps:**

1. Review the commit diff carefully
2. Identify who made the changes (check Supabase audit logs)
3. Verify the changes are intentional
4. If unwanted, revert the database changes in Supabase
5. Re-run the workflow to sync the reverted state

### Making Schema Changes Properly

The recommended workflow for schema changes:

1. **Make changes in Supabase** (Dashboard or SQL Editor)
   - Modify tables, add columns, update RLS policies, etc.
   
2. **Document as migration** (optional but recommended)
   - Create a dated SQL file in `supabase/migrations/`
   - Example: `20260110_add_user_preferences.sql`
   - This helps track the history of intentional changes

3. **Wait for automatic sync**
   - The workflow will detect and commit the changes within 24 hours
   - Or manually trigger the workflow for immediate sync

4. **Review and merge**
   - Check the automated commit
   - Merge to main branch

### Manual Schema Sync

To sync immediately without waiting for the scheduled run:

1. Go to **Actions** tab in GitHub
2. Select **Sync Supabase Schema** workflow
3. Click **Run workflow**
4. Choose the branch (usually `main`)
5. Click **Run workflow** button

The workflow will complete in ~1-2 minutes.

## Troubleshooting

### Workflow Fails to Connect

**Error**: Connection timeout or authentication failure

**Solutions**:
- Verify `SUPABASE_DB_PASSWORD` is correct
- Check `SUPABASE_PROJECT_ID` matches your project
- Ensure database is not paused (Supabase free tier pauses after inactivity)
- Verify Supabase project allows connections from GitHub Actions IPs

### Type Generation Fails

**Error**: TypeScript types cannot be generated

**Solutions**:
- Check `SUPABASE_ACCESS_TOKEN` is valid and not expired
- Verify the token has necessary permissions
- Try regenerating the access token in Supabase Dashboard

### Git Conflicts

**Error**: Cannot push due to conflicts

**Solutions**:
- Someone pushed to the branch between checkout and push
- Re-run the workflow (it will pull latest changes)
- Manually resolve conflicts if persistent

### Schema File Is Empty or Incomplete

**Error**: `schema.sql` is empty or missing tables

**Solutions**:
- Check Supabase CLI version (update to latest)
- Verify database connection string is correct
- Check that the `public` schema exists and has tables
- Review workflow logs for specific errors

## Best Practices

### DO ✅

- **Review automated commits** before merging to production
- **Keep migration files** in `supabase/migrations/` for documentation
- **Test schema changes** in development before production
- **Monitor workflow runs** for failures
- **Use RLS policies** for all tables (these are synced)

### DON'T ❌

- **Don't edit `schema.sql` manually** - it will be overwritten
- **Don't edit `lib/supabase/database.ts` manually** - it's auto-generated
- **Don't commit secrets** to the repository
- **Don't bypass the sync** by making direct production changes without syncing
- **Don't disable the workflow** without team discussion

## Maintenance

### Regular Tasks

- **Monthly**: Review accumulated schema changes
- **Quarterly**: Audit RLS policies in `schema.sql`
- **When onboarding**: Explain this document to new engineers

### Updating the Workflow

If you need to modify the sync workflow:

1. Edit `.github/workflows/sync-supabase-schema.yml`
2. Test changes on a feature branch first
3. Monitor the first run carefully
4. Document any changes in this file

## Schema History

The Git history of `supabase/schema/schema.sql` provides:

- **When** schema changes occurred
- **What** changed (via diff)
- **Why** changes were made (via commit messages or linked PRs)

To view schema history:

```bash
# See all schema changes
git log --follow supabase/schema/schema.sql

# See what changed in a specific commit
git show <commit-hash> supabase/schema/schema.sql

# Compare schema between two dates
git diff <date1> <date2> supabase/schema/schema.sql
```

## Questions or Issues?

If you encounter problems with schema synchronization:

1. Check this document first
2. Review workflow logs in GitHub Actions
3. Check Supabase Dashboard for database status
4. Reach out to the team for assistance

## Related Documentation

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PostgreSQL Schema Documentation](https://www.postgresql.org/docs/current/ddl-schemas.html)
