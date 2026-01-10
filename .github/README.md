# .github Directory

This directory contains GitHub-specific configurations and documentation.

## Contents

### Workflows (`workflows/`)

**`sync-supabase-schema.yml`** - Automated Supabase schema synchronization
- Runs daily at 2 AM UTC
- Dumps database schema to `supabase/schema/schema.sql`
- Regenerates TypeScript types in `lib/supabase/database.ts`
- Only commits when actual schema changes are detected
- See [SCHEMA_SYNC.md](../SCHEMA_SYNC.md) for details

### Documentation

**`SECRETS_SETUP.md`** - Guide for configuring GitHub Actions secrets
- Required secrets for schema sync workflow
- Step-by-step setup instructions
- Troubleshooting tips

### Copilot Configuration

**`copilot-instructions.md`** - Instructions for GitHub Copilot AI assistant
- Coding conventions and best practices
- Project-specific guidelines

**`instructions/`** - Additional instruction files for AI agents
- Code change guidelines
- Documentation update rules

**`agents/`** - Custom AI agent definitions
- Expert agent configurations for specialized tasks

**`prompts/`** - Planning prompts for complex features
- Architectural planning documents
- Feature implementation plans

## GitHub Actions Workflows

### Running Workflows Manually

To trigger a workflow manually:

1. Go to **Actions** tab
2. Select the workflow (e.g., "Sync Supabase Schema")
3. Click **Run workflow**
4. Choose the branch
5. Click **Run workflow** button

### Monitoring Workflows

- View workflow runs in the **Actions** tab
- Each run shows detailed logs for debugging
- Failed runs trigger notifications (if configured)

### Workflow Secrets

Required secrets are documented in [SECRETS_SETUP.md](SECRETS_SETUP.md).

Configure secrets in: **Settings** → **Secrets and variables** → **Actions**

## Adding New Workflows

When creating new workflows:

1. Add `.yml` file to `workflows/` directory
2. Follow GitHub Actions syntax
3. Use existing workflows as templates
4. Document required secrets in `SECRETS_SETUP.md`
5. Test on a feature branch first
6. Update this README with workflow description

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides)
