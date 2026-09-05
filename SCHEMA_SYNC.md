# Database changes and schema sync

Production Postgres is hosted by Supabase. `supabase/schema/schema.sql` and
`lib/supabase/database.ts` are generated snapshots of that hosted project, not
files to edit to apply a change. The daily workflow downloads metadata and types;
it does not deploy migrations.

The workflow uses native PostgreSQL 17 tools. It generates the pinned Supabase
CLI's dump filters with `--dry-run`, removes placeholder connection exports, and
executes those filters with real credentials supplied only through the process
environment. No Docker daemon is needed and no database rows enter the schema file.

Prepare database changes as versioned SQL files in `supabase/migrations`. Test
them before deployment. The September 2026 maintenance migrations are pending:
apply `202609050001_security_and_account_integrity.sql` followed by
`202609050002_atomic_snapshots.sql` during the coordinated release described in
[maintenance deployment](docs/maintenance-deployment.md).

Do not replay the entire historical migrations directory against an existing
project. Older files overlap the generated baseline and may already be applied.
Do not use `supabase db reset` against production.

After the approved migrations are applied, run the existing schema-sync workflow
or wait for its scheduled run. Review the generated diff. Keep the pending RPC
type declaration in the snapshot route until generated types include that RPC,
then remove the local extension and use the generated client directly.

## Local verification

`bun run validate:schema-sync` checks workflow syntax, required operations and
documentation. It runs on Windows and Linux without Bash, credentials, or a
database connection. It does not prove the deployed schema matches the repo.

`bun run test:db` uses native PostgreSQL 17+ binaries. Docker and the Supabase CLI
are not required. Put `initdb`, `pg_ctl` and `psql` on PATH, or set `POSTGRES_BIN`
to their directory. The runner initializes a new cluster in the OS temporary
directory, listens only on 127.0.0.1 at an available port, and uses a random
password. It verifies the connected data directory before loading any test SQL.
It never accepts a hosted database URL or an existing cluster.

On Windows, use the portable archive linked by the
[PostgreSQL Windows downloads page](https://www.postgresql.org/download/windows/)
and [EDB binary downloads](https://www.enterprisedb.com/download-postgresql-binaries?lang=en).
No Windows service or system-wide installation is needed. This workstation's
verified PostgreSQL 17.11 binaries are cached at:

```powershell
$env:POSTGRES_BIN = Join-Path $env:LOCALAPPDATA 'statsforspotify/postgres/17.11-3/pgsql/bin'
bun run test:db
```

On Linux, install PostgreSQL 17 with its standard extensions, then set
`POSTGRES_BIN=/usr/lib/postgresql/17/bin` if that directory is not on PATH. Run
the tests as a normal user; PostgreSQL refuses `initdb` as root. CI installs the
native package and runs this same command without Docker.

The runner loads the immutable baseline, reproduces original defects, applies the
two maintenance migrations and runs SQL authorization/persistence suites. Real
separate sessions verify same-range collection, cross-range aggregate updates and
data deletion queued behind collection. It stops its own server and removes its
checked temporary directory after success; failed runs retain diagnostic files.

`bun run test:db:core` runs the same SQL tests using embedded PostgreSQL (PGlite).
Both runners use synthetic Auth users/claims and omit only the pg_cron, pg_net,
pg_stat_statements and supabase_vault extension declarations. They retain the
pg_trgm, pgcrypto and uuid-ossp extensions. The native runner additionally verifies
real concurrent PostgreSQL sessions. Neither runner establishes actual Supabase
Auth, PostgREST, or hosted operational behavior. Those checks need an isolated
Supabase test project and test credentials. The organization currently has both
free project slots in use; no paid project was created or existing project paused.

The immutable schema fixture keeps migration regression tests reproducible after
the generated production snapshot changes. Update or add fixtures deliberately
when testing a later migration baseline.
