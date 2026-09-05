# Scheduled snapshot collection

This Supabase Edge Function collects the three Spotify time ranges for connected
accounts. It shares snapshot preparation and an atomic database RPC with the
dashboard collector. Existing completed ranges are skipped on retry.

## Request and result

Call with POST and an Authorization Bearer value matching
`FUNCTION_COLLECT_SNAPSHOTS_SECRET` (or the existing service role fallback).
Other methods return 405; invalid authorization returns 401.

Results include processed, succeeded, failed, revoked, deferred, and errors.
A Spotify quota response stops new requests in this invocation and returns 429
with Retry-After. Already in-flight requests finish. Configure the scheduler to
retry after that cooldown; this function does not schedule itself. Other partial
failures return 502. A successful complete run returns 200.

Connections are read in ordered pages of 500. At most two users are processed
concurrently, with 500 ms between ranges and 2 seconds between batches. These
delays do not promise a fixed Spotify request allowance. Large account populations
may require scheduler continuation within the deployed Edge runtime limit.

## Credentials and persistence

Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SPOTIFY_CLIENT_ID,
SPOTIFY_CLIENT_SECRET; use a dedicated FUNCTION_COLLECT_SNAPSHOTS_SECRET.
Refresh tokens stay in the service-only spotify_connections table. Rotation and
status updates check that the stored token still matches so stale work cannot
overwrite a reconnect. Token values and raw token response bodies are not logged.

`persist_snapshot` serializes writes per user and commits the snapshot, all
rankings, previous ranks, and artist aggregates in one transaction. UTC calendar
days use an exclusive next-day boundary, including fractional seconds. A failed
write leaves no partial snapshot.

## Verification and deployment

Run `bun run test`, `bun run test:db:core`, `bun run test:db`, and
`deno check --no-lock supabase/functions/collect-snapshots/index.ts` from the repo.

Deploy with the Supabase CLI so imports from ../_shared are included. Pasting only
index.ts into a dashboard editor is insufficient. Follow the coordinated
[maintenance release procedure](../../../docs/maintenance-deployment.md); the
new function depends on both pending September 2026 migrations.
