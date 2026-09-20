# Supabase schema synchronization

[Sync Supabase Schema](../.github/workflows/sync-supabase-schema.yml) records the production database schema in the repository. It runs daily at **02:00 UTC** and supports manual dispatch from the Actions tab.

The workflow reads the database, writes a schema-only dump to [`supabase/schema/schema.sql`](../supabase/schema/schema.sql), and generates `lib/supabase/database.ts` with the Supabase CLI. When either file changes, it commits and pushes both to the workflow's branch. It never applies migrations or deploys application code.

## Configuration

Configure `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, and `SUPABASE_DB_PASSWORD` as repository Actions secrets — see [GitHub Actions setup](github-actions.md).

The workflow uses the IPv4 transaction pooler for its schema dump and the project ID for type generation. Confirm both identify the intended project before changing the workflow configuration.

## Developing migrations

> [!IMPORTANT]
> The checked-in dump and the generated TypeScript file are snapshots of **production**. Do not edit them by hand, and do not replace them with an experimental local schema.

Keep schema changes in migration files under `supabase/migrations/` and rehearse them against an isolated local database. Generate candidate types from the migrated local database for compilation checks, then restore the production-generated file before committing the migration.

Application-specific type refinements belong in `lib/supabase/types.ts`. Ranking data lives in the private `ranking_storage` schema; the public `artist_rankings`, `track_rankings`, and `album_rankings` names are security-invoker views over it, and the ranking adapter reads through those views.

After an approved production migration deploys and verifies, run or await the sync and review the resulting schema and type diff.

## Local validation

From the repository root:

```sh
bun run validate:schema-sync
```

On Windows, use Git Bash if `bash` resolves to an unavailable WSL installation:

```powershell
& 'C:/Program Files/Git/bin/bash.exe' scripts/validate-schema-sync.sh
```

This check validates workflow structure, required file paths, and secret references. It does not contact Supabase, compare schemas, validate credentials, or prove migration safety — run lint, build, and the migration's own integration checks separately.
