# Supabase schema

`schema.sql` is the generated snapshot of the hosted production database. Do not
edit it manually. New changes belong in versioned migration files; test them,
apply them during an approved release, then regenerate the schema and types.

The daily GitHub workflow downloads schema metadata and types. It does not apply
migrations. See [schema synchronization](../../SCHEMA_SYNC.md) and the
[maintenance release procedure](../../docs/maintenance-deployment.md).

Use `bun run test:db:core` for supplemental SQL checks or `bun run test:db` for
a disposable local Supabase test. Neither command connects to production.
Historical migrations overlap the dump; do not replay them all against an
existing project.
