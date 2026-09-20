# Repository automation

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| [Sync Supabase Schema](workflows/sync-supabase-schema.yml) | Daily at 02:00 UTC; manual dispatch | Read the production schema, regenerate the SQL and TypeScript snapshots, and commit the changes. |
| [Compact ranking storage](workflows/compact-ranking-storage.yml) | Manual dispatch | Inspect or run the compact ranking storage migration steps. |
| [Maintenance database backup](workflows/maintenance-database.yml) | Manual dispatch | Inspect the configured production database and create an encrypted backup artifact. |
| [Maintenance production release](workflows/maintenance-release.yml) | Manual dispatch | Inspect or execute a selected maintenance release operation against an exact reviewed commit. |

[Dependabot](dependabot.yml) checks Bun dependencies weekly. The maintenance workflows are separate from schema synchronization — schema sync never executes migrations.

## Documentation

- [GitHub Actions setup](../docs/github-actions.md) — required secrets, run monitoring, common failures
- [Schema synchronization](../docs/schema-sync.md) — generated-file ownership, local validation, migration coordination
- [Schema directory](../supabase/schema/README.md)

Run `bun run validate:schema-sync` from the repository root to check the schema-sync workflow's structure. This validation runs no workflow and does not access production.
