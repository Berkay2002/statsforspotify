# Database schema

`schema.sql` is the authoritative dump of the production database: tables, types, functions, triggers, indexes, and RLS policies.

> [!WARNING]
> Do not edit `schema.sql` by hand. It is regenerated daily by the [Sync Supabase Schema](../../.github/workflows/sync-supabase-schema.yml) workflow and any manual change is overwritten. See [Schema synchronization](../../docs/schema-sync.md).

## Working with it

```bash
# Tables, and the row-level security policies that guard them
grep "CREATE TABLE" schema.sql
grep "CREATE POLICY" schema.sql

# What changed, and when
git log --follow -p schema.sql
```

To recreate the database in a fresh environment:

```bash
supabase db reset          # via the Supabase CLI
psql "$DATABASE_URL" < schema.sql   # or directly
```

## Making schema changes

1. Write the change as a migration in `supabase/migrations/` and rehearse it locally.
2. Apply it to the Supabase project.
3. Wait for the daily sync, or dispatch the workflow manually.
4. Review the resulting schema and type diff in the automated commit.
