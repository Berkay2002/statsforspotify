# Migration test baseline

`baseline_schema.sql` is an exact copy of `supabase/schema/schema.sql` at commit
`482cfd9933f9fac77d81fb9aab217791e78e17f7`, before the September 2026 audit repairs.
It contains schema definitions only, with no user data or credentials.

Keep this fixture immutable. Both database test runners restore it, reproduce
the original vulnerabilities against synthetic users, apply the audit migrations,
and run the regression suites. The daily schema sync must continue updating
`supabase/schema/schema.sql` and the generated application types, not this fixture.
This separation prevents tests from applying migrations twice after deployment.

The fixture establishes a reproducible migration starting point. It does not
claim to represent the current hosted database. Review current schema drift and
run migration preflight queries separately before any production rollout.

`bun run test:db` uses a disposable native PostgreSQL 17+ cluster without Docker.
It runs two real psql sessions, waits until the second operation
is blocked on the first operation's user lock, then verifies same-range retry,
cross-range aggregate updates and a queued data deletion after collection.
`bun run test:db:core` uses PGlite. Both use the same minimal Auth users/claim shims,
retain pg_trgm, pgcrypto and uuid-ossp, and omit the pg_cron, pg_net,
pg_stat_statements and supabase_vault declarations. Both verify PostgreSQL
functions, RLS, grants, triggers, constraints and transaction rollback. Only the
native runner verifies concurrent sessions. Neither verifies actual Supabase Auth,
PostgREST or hosted operational extensions. See [setup](../../../SCHEMA_SYNC.md).
