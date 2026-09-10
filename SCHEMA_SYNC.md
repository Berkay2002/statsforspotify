# Supabase schema synchronization

[Sync Supabase Schema](.github/workflows/sync-supabase-schema.yml) records the configured production database schema in the repository. It runs daily at **02:00 UTC** and supports manual dispatch from GitHub Actions.

The workflow reads the database, writes a schema-only dump to `supabase/schema/schema.sql`, and generates `lib/supabase/database.ts` with the Supabase CLI. When either file changes, it commits and pushes both files to the workflow's branch. It does not apply migrations or deploy application code.

## Configuration

Configure `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, and `SUPABASE_DB_PASSWORD` as repository Actions secrets. See [Secrets setup](.github/SECRETS_SETUP.md) for their purpose and [Workflow monitoring](.github/WORKFLOW_MONITORING.md) for run inspection.

The workflow currently uses the IPv4 transaction pooler in `aws-1-eu-central-1` for its schema dump and the project ID for type generation. Confirm that both identify the intended project before changing the workflow configuration.

## Developing migrations

Keep the checked-in schema dump and generated TypeScript file as snapshots of production. Do not edit them manually or replace them with an experimental local schema. Store schema changes in migration files and rehearse them against an isolated local database.

Generate candidate types from the migrated local database for compilation checks, then restore the production-generated file before committing the migration. Application-specific type refinements belong in `lib/supabase/types.ts`; the ranking adapter supports both the original tables and the compact storage views.

Coordinate the compact ranking migration with the daily sync. Until an explicitly approved production migration succeeds, the sync will continue to generate the original table schema. After deployment and verification, run or await the sync and review the resulting schema/type diff. Do not manually dispatch the production sync on an experimental branch expecting it to generate the local candidate schema.

## Local validation

Run from the repository root:

```sh
bun run validate:schema-sync
```

On Windows, use Git Bash if `bash` resolves to an unavailable WSL installation:

```powershell
& 'C:/Program Files/Git/bin/bash.exe' scripts/validate-schema-sync.sh
```

This check validates workflow structure, required file paths, and secret references. It does not contact Supabase, compare schemas, validate credentials, or prove migration safety. Run lint, build, and the migration's local integration checks separately.
