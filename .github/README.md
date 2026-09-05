# Repository workflows

- `verify.yml`: lint, type checking, isolated Bun tests, schema-workflow checks,
  build, Playwright smoke tests, SQL integration tests, and Edge Function checking.
  Test environments use local or synthetic configuration, without production secrets.
- `sync-supabase-schema.yml`: downloads the hosted schema and generated types
  daily and on manual dispatch. It commits metadata changes; it does not deploy SQL.
- Dependabot proposes dependency updates. Review compatibility and run verification
  before merging.

- `maintenance-database.yml`: manually creates an encrypted public/Auth backup
  using native PostgreSQL. Only its public encryption key is stored in GitHub.
- `maintenance-release.yml`: manually runs guarded, ordered release steps against
  the fixed production project. See the [release procedure](../docs/maintenance-deployment.md).

See [schema synchronization](../SCHEMA_SYNC.md), [secret setup](SECRETS_SETUP.md),
and [maintenance deployment](../docs/maintenance-deployment.md).
