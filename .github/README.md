# Repository automation

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| [Sync Supabase Schema](workflows/sync-supabase-schema.yml) | Daily at 02:00 UTC; manual dispatch | Read production schema, regenerate SQL and TypeScript snapshots, and commit changes to the workflow branch. |
| [Maintenance database backup](workflows/maintenance-database.yml) | Manual dispatch | Inspect the configured production database and create an encrypted backup artifact. |
| [Maintenance production release](workflows/maintenance-release.yml) | Manual dispatch | Inspect or execute a selected maintenance release operation against an exact reviewed commit. |

[Dependabot](dependabot.yml) checks Bun dependencies weekly. The maintenance workflows are separate from schema synchronization; schema sync does not execute migrations.

## Schema synchronization

See [Schema sync](../SCHEMA_SYNC.md) for generated-file ownership, local validation, and migration coordination. The checked-in SQL and TypeScript snapshots describe production, including while a proposed migration is being tested locally. Coordinate the compact ranking migration with the daily sync and refresh these snapshots after approved production deployment.

- [Secrets setup](SECRETS_SETUP.md)
- [Workflow monitoring](WORKFLOW_MONITORING.md)
- [Schema directory](../supabase/schema/README.md)

Run `bun run validate:schema-sync` from the repository root to check the schema-sync workflow's structure. This validation does not run any workflow or access production.
