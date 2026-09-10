# Compact ranking storage

Status: implemented and rehearsed against an isolated copy on 2026-09-10. Production has not been migrated. See [measured results](RESULTS.md).

The [migration](../../supabase/migrations/20260910122700_compact_ranking_storage.sql) preserves every ranking UUID, snapshot, owner, timestamp, rank, previous rank, popularity and metadata value. It stores repeated descriptive metadata once per user and version. Public ranking names become writable security-invoker views; current application and collector inserts retain their endpoints and payloads. The Table Editor will still show the same logical ranking count.

Private `ranking_storage` tables have RLS and no API-role schema access. SELECT policies match the tested source policies exactly. Definer triggers enforce the original owner INSERT/DELETE rules and absence of an authenticated UPDATE policy. Service-role updates create metadata versions rather than changing earlier observations. Deleting the last observation removes unused metadata; account and snapshot cascades remain effective.

`ranking_storage_backup` retains **empty original table definitions**, including constraints, indexes, policies, defaults and grants. It contains no duplicate history. Keep these definitions while rollback support is required. The [rollback](../../supabase/rollback/compact_ranking_storage.sql) reconstructs the original tables from current data, including post-migration writes.

## Supported operations and limits

- Existing application SELECT, bulk INSERT, service UPDATE, DELETE, RPCs and PostgREST snapshot embedding were tested.
- Mutations, including cascaded deletes, require PostgreSQL's default **READ COMMITTED** isolation. Other levels abort with `0A000`. Concurrent stale updates/deletes can return `40001`; administrative clients should retry the whole transaction.
- Collector batches use one owner and snapshot. Keep administrative imports within that boundary; coordinate cross-owner maintenance and account deletion rather than running bulk maintenance jobs concurrently.
- These views do not provide table-only operations such as `TRUNCATE`, `ON CONFLICT`/upserts, or new foreign keys pointing at ranking views. Current application callers do not use them. Realtime publication of these relations is not supported; preflight refuses existing publication membership.
- Exact schema/policy fingerprints intentionally reject drift. Unexpected dependent views/functions, incoming foreign keys and custom triggers also abort. Investigate and rehearse changed contracts instead of bypassing these checks.

## Local verification

All tests connect only through Docker exec to the fixed container `statsforspotify-storage-lab-20260910`, using the allowlisted databases `stats_storage_baseline` and `stats_storage_ready`. The transport verifies `--network none`, no host ports and `cron.launch_active_jobs=off`. It accepts no remote database URL. On Windows it uses native Docker in `DeepSWE-Docker` WSL; `RANKING_STORAGE_DOCKER_DISTRO` can select another local distribution.

Set `RANKING_STORAGE_LAB` to the private artifact directory outside Git. The current lab uses `C:/Users/berka/.codex/scratch/statsforspotify-storage-lab-20260910`. Backups include Auth data and Spotify connection credentials: retain the directory's restricted ACLs. Do not upload the raw exports or private comparison logs.

The original clone was restored from schema and COPY exports prepared with Supabase CLI 2.117.0, using read-only export sessions. It uses `public.ecr.aws/supabase/postgres:17.6.1.063`. Candidate databases are independent copies of the untouched restored source. The lab uses no scheduled workers or external Auth/Spotify integrations.

Start the retained container in an attached terminal so WSL remains active:

```powershell
wsl -d DeepSWE-Docker -- docker --host unix:///var/run/docker.sock start --attach statsforspotify-storage-lab-20260910
```

Run tests **sequentially**, without other test writers. Some create committed temporary snapshots and clean them in `finally`; concurrent test suites would invalidate full-data comparisons.

```sh
python scripts/ranking-storage/test_writes.py
python scripts/ranking-storage/test_concurrency.py
python scripts/ranking-storage/test_preflight.py
python scripts/ranking-storage/test_reads.py
python scripts/ranking-storage/benchmark.py
python scripts/ranking-storage/test_rollback.py
```

`test_rest.py` additionally requires the retained PostgREST containers: `statsforspotify-storage-rest-ready` on loopback 3000 and `statsforspotify-storage-rest-baseline` on loopback 3001. They share the network-disabled database container's namespace. `/lab/loopback_proxy.py`, launched inside the database container, bridges namespace-local 5432 to its Unix socket. It exposes no host port. Restart this test-only bridge after restarting the database container; then start those two REST containers. Both use the local-only signing key in `test_rest.py`, never a production credential.

```powershell
wsl -d DeepSWE-Docker -- docker --host unix:///var/run/docker.sock exec -d statsforspotify-storage-lab-20260910 python3 /lab/loopback_proxy.py
wsl -d DeepSWE-Docker -- docker --host unix:///var/run/docker.sock start statsforspotify-storage-rest-ready statsforspotify-storage-rest-baseline
python scripts/ranking-storage/test_rest.py
```

`test_backup.py` uses the updated production backup schema selection and restores into the fixed **new** database `stats_storage_backup_restore`. It refuses to replace an existing database. The successful restored copy is retained in this lab; call its `verify_data()` function to recheck that copy without restoring over it.

`generate.py` regenerates forward and rollback SQL without connecting to any database. Re-run the migration rehearsal after changing its templates. JSON result summaries are written to the private artifact directory.

Type generation was tested through postgres-meta v0.99.0 against the migrated local database, including `postgrest_version=14.5`. Both migrated and original generated types compile through `lib/supabase/types.ts`. The checked-in generated files continue to describe production; see [schema synchronization](../../SCHEMA_SYNC.md).

## Production rollout procedure — not executed

1. Review the exact migration, application adapter, backup workflow and rollback together. Deploy the compatible application adapter and updated backup workflow first; the adapter supports the original tables. The existing maintenance-release workflow targets older migrations and **must not be used as this migration's runner**.
2. Arrange a brief maintenance window. Block incoming application mutation requests through hosting access controls, pause the scheduled collector, and let in-flight collection finish. This repository does not currently provide a general maintenance environment flag. Verify the actual pause; do not assume the older release workflow's maintenance check applies.
3. Export a fresh encrypted backup containing `public`, `auth`, `ranking_storage` and `ranking_storage_backup` when present. Restore it locally and verify the new copy. Confirm adequate database/disk headroom for old plus new tables, indexes and WAL. Rehearse the exact source schema; a drift rejection is a stop condition.
4. With the verified target connection supplied through PostgreSQL environment variables, apply only the reviewed file using `psql -X -v ON_ERROR_STOP=1 -f supabase/migrations/20260910122700_compact_ranking_storage.sql`. Do not run a generic `db push` that might include unrelated pending migrations. The script uses a transaction, bounded lock/statement timeouts, maintenance advisory lock, source table locks, and exact bidirectional row comparison before releasing old data.
5. Record version `20260910122700` in the project's migration history after successful application, using Supabase CLI migration repair for that exact version if the runner did not record it. Do not mark a failed migration applied. Wait for PostgREST's schema cache reload; verify all ranking endpoints and a controlled snapshot write. Confirm history, privacy, export, row counts and unused-metadata counts. Resolve any failure while writers remain paused.
6. Resume traffic and the collector, verify collection and error rates, and monitor query latency and storage. Run or await production schema synchronization and review its generated diff. Take a new backup with the private schemas included.

The lock timeout is 10 seconds and the statement timeout is 180 seconds. Timeout or failed equality aborts the transaction; it is not permission to skip checks. Local timings are not an SLA for the hosted database.

## Rollback procedure — locally rehearsed

Pause and drain writers using the same maintenance controls. Keep a fresh backup of current data. Run `psql -X -v ON_ERROR_STOP=1 -f supabase/rollback/compact_ranking_storage.sql` against the verified target. It locks storage, recreates original rows, checks exact equality, restores the original table definitions, and removes private storage in one transaction. There is no `DROP CASCADE`; unexpected new dependencies abort rollback and require review.

After success, mark only version `20260910122700` reverted in migration history, verify the application against the restored tables, refresh generated schema snapshots, then resume traffic. The application adapter remains compatible. Do not drop the empty rollback templates or restore an old data dump over newer writes.
