# Local rehearsal results — 2026-09-10

The final migration is prepared for a controlled rollout. Production was not changed or deployed. The initial read-only prototype has been replaced by writable views, per-user metadata, narrow indexes, explicit authorization, concurrency handling and a tested rollback.

## Storage

| Restored database | Before | After | Saving |
| --- | ---: | ---: | ---: |
| Whole database | 157.44 MB | 66.89 MB | 90.55 MB (57.5%) |
| Ranking tables and indexes, including rollback templates | 145.07 MB | 53.81 MB | 91.27 MB (62.9%) |

Decimal MB; PostgreSQL physical relation/database sizes after ANALYZE/VACUUM. These are measurements of the local logical restore, not promises about the hosted cluster's exact post-migration size. WAL, system catalogs and existing bloat differ. Narrow indexes are built after copying rows.

All **111,376 artist, 119,850 track and 92,555 album rankings** and **2,397 snapshots** remain. The ranking views still return 323,781 logical rows; this is lossless storage normalization, not history deletion or downsampling.

## Verification

- 100 original-versus-migrated SQL read/write checks passed, including full ranking rows under owner/friend/stranger/anonymous/service/admin roles, defaults, nulls, constraint errors, atomic batches, account/snapshot cascades and six simultaneous-writer cases.
- 33 additional checks passed: deterministic ownership-transfer/disjoint-update/prune-and-reuse races, plus explicit rejection of unsupported isolation levels without persistence.
- 36 actual PostgREST checks passed across all ranking types, including bulk RETURNING, metadata edits, FK snapshot embedding, original HTTP/error status behavior, ownership and atomicity.
- 244 history, sparkline, recap and viewer/owner visibility comparisons matched; nine privacy/friendship-state fixtures also matched.
- 12 preflight/private-schema checks passed: policy/constraint/dependency drift aborts without leaving migration changes, and API roles cannot directly read private metadata.
- Forward migration checks every typed row using bidirectional EXCEPT ALL. Rollback and reapply preserved original data plus committed post-migration inserts, edits, deletions and a non-default PostgreSQL array lower bound; fixture cleanup returned the exact original fingerprints.
- The updated backup command worked both before and after migration. A full custom-format backup restored into a separate database; all **37 application, Auth and private tables** matched typed-row fingerprints.
- ESLint, TypeScript and Next.js production build passed. The build was checked against both generated candidate types and the original production types; local placeholder Supabase settings were supplied for prerendering. No live Spotify/OAuth browser flow was executed.
- Schema-sync validation passed through Git Bash. The default Windows `bash` command resolves to an unavailable WSL shell; this is documented in SCHEMA_SYNC.md.
- Independent read-only review found no remaining concrete blocker in the migration generator after the concurrency, policy and dependency fixes.

## Query timings

Median PostgreSQL execution times from three EXPLAIN ANALYZE runs as the authenticated owner, on the same copied data and hardware. These are small local samples, not a sustained-load test or network request timings.

| Query | Original ms | Compact ms |
| --- | ---: | ---: |
| latest_artists | 0.567 | 0.794 |
| previous_artist_ranks | 0.323 | 0.673 |
| profile_artist_count | 19.913 | 26.998 |
| artist_history | 4.059 | 4.594 |
| hall_of_fame | 353.855 | 310.668 |

Representative service-role batches of up to 50 existing-metadata rows took about 9–10 ms in compact storage. Inserts cost more work than the original plain tables; the final design trades that modest write overhead for substantially smaller storage. Latest-snapshot reads remain sub-millisecond in this sample, and history remains around 5 ms.

## Artifacts and operational boundary

Runbook: [README.md](README.md). Migration SHA-256: `e37fa620270f0e10d9b149d451890107b2761871a9a6324aaaa1482f3aee6efb`.

Raw exports, generated candidate types, detailed plans and JSON results remain in the restricted local artifact directory, outside Git. Test database engines: PostgreSQL 17.6 (Supabase image 17.6.1.063), PostgREST 14.17; type introspection used postgres-meta 0.99.0 and preserved the existing PostgREST 14.5 type hint.

Production rollout still needs an approved maintenance window, freshly restored backup, verified target/schema, paused writers, cache reload and live smoke checks. Writes require READ COMMITTED. Table-only operations such as upserts, TRUNCATE or new incoming foreign keys are outside the supported view contract. Backups must retain both private schemas. The generated production schema snapshots remain unchanged until actual deployment.
