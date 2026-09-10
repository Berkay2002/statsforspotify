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

## Production rollout procedure

Use `.github/workflows/compact-ranking-storage.yml` on `main`. Every operation requires the exact reviewed `expected_sha`; the runner rejects a changed main branch. Never use the older maintenance-release workflow or a generic `db push` for this migration.

1. Deploy the compatible application and backup changes with `rankingStorageMaintenance = true` in `lib/maintenance.ts`. Confirm production rejects mutation requests with HTTP 503 and the exact commit header. Dispatch `pause`; retain its run ID and original collector-state artifact. Wait at least three minutes for active requests to drain.
2. Run `maintenance-database.yml`. Download and decrypt its encrypted artifact into the restricted local backup directory, restore into a new isolated database, and rehearse the exact release wrapper and smoke SQL. Retain the backup run ID. Never put decrypted backups or credentials in Git.
3. Dispatch `migrate` with the maintenance commit, `backup_run_id` and `pause_run_id`. The runner verifies the target, deployment, recent successful backup, paused collector and drained writers. It applies only the reviewed migration, checks typed-row fingerprints under source locks, and records migration history inside the same transaction. Inspect the successful result artifact.
4. Dispatch `verify` at the same commit. Require successful rolled-back owner/service writes, anonymous isolation, unchanged persisted fingerprints, and real production REST reads with snapshot embedding before ending maintenance.
5. Set the maintenance switch false, commit and deploy. Confirm the new production commit returns the normal unauthenticated HTTP 401 with its release header. Dispatch `resume` using this new commit and the original pause run ID; it restores the original collector state.
6. Take a post-migration encrypted backup and run production schema synchronization. Fetch its generated commit, verify the application build and keep the worktree current with origin.

The lock timeout is 10 seconds and the statement timeout is 180 seconds. Timeout or failed equality aborts the transaction; it is not permission to skip checks. Local timings are not an SLA for the hosted database.

## Rollback procedure — locally rehearsed

Pause and drain writers using the same maintenance controls, and take a fresh verified backup. Dispatch `rollback` with the maintenance commit, backup run ID and pause run ID. The runner reconstructs the original tables from current data, checks exact equality and removes only version `20260910122700` from migration history in the same transaction. Unexpected dependencies abort without `DROP CASCADE`.

Require a successful `verify` against the restored original tables, then deploy with maintenance false and `resume` using that new commit. Refresh generated schema snapshots. The application adapter supports either storage format. Do not drop the empty rollback templates or restore an old dump over newer writes.
