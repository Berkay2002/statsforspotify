# Maintenance deployment

The owner authorized publication and production deployment after completing the
local audit. This document records the procedure and release evidence. Docker is
not required for database tests, backups, or Edge Function deployment.

## September 5 release preparation

- GitHub's existing repository secrets successfully accessed the intended Supabase
  project, `zpswcygleazebxmpblcx`, through its IPv4 session pooler. The local Supabase
  CLI account does not have access to this project.
- Backup workflow run `33993398909` completed successfully. Its encrypted artifact
  contains the `public` and `auth` schemas and data. The private decryption key and
  downloaded archive are in the operator's protected local
  `%LOCALAPPDATA%\statsforspotify\release-20260905` directory, outside Git.
- The downloaded archive decrypted successfully and restored into disposable
  native PostgreSQL 17. Both pending migrations then applied successfully without
  changing any public/Auth table count. Counts include 4 users, 2,382 snapshots,
  110,679 artist rankings, 119,100 track rankings and 91,971 album rankings.
  Restore the pre-migration backup with PostgreSQL's timezone set to UTC.
- This is a scoped application/Auth backup. Restore verification omitted ownership
  and ACL replay; it does not establish full-project recovery of hosted Auth
  services, global roles, cron, vault, or storage.
- Hosted preflight returned zero ownership mismatches and duplicate UTC days.
  The CLI's database security advisor returned no issues. Its checks do not detect
  all application authorization defects documented in the audit.
- Collector version 6 has JWT verification disabled and the expected Spotify
  client secrets configured. The replacement preserves that existing gateway
  setting and enforces its bearer secret inside the handler. The active schedule
  is `collect-daily-snapshots`, daily at 06:00 UTC.
- Production migration and collector deployment remain pending Vercel passkey
  sign-in and verification of server environment variables. The release workflow
  refuses mutation until the new app is visibly in maintenance mode.

The manually dispatched `maintenance-release.yml` workflow accepts the exact
reviewed commit SHA and one step: `inspect`, `migrate`, `collector`, or `resume`.
`migrate` also requires a successful backup run from the last 24 hours whose
archive has been restored locally. It applies only the two reviewed migrations
in one transaction, records their migration history, checks row counts, pauses
the collector schedule and reloads PostgREST's schema cache. An already running
collector must finish before migration; pausing cron does not cancel invocations.
Run `collector` successfully before `resume`.

To verify a downloaded backup without Docker, decrypt with
`node .github/scripts/database-backup.mjs decrypt <encrypted-file> <new-dump-file> <private-key-file>`,
then run `bun scripts/verify-database-backup.ts <new-dump-file> --check-maintenance`
with `POSTGRES_BIN` set to the native PostgreSQL binaries. Keep the key and dumps
outside the repository. The encrypted GitHub artifact expires after seven days.

## Before release

1. Run `bun install --frozen-lockfile`, `bun audit`, `bun run test`, `bun run test:db:core`,
   `bun run test:db`, `bun run lint`, `bun run typecheck`,
   `bun run validate:schema-sync`, `bun run build`, and `bun run test:e2e`.
   Check the Edge Function with Deno as CI does.
2. Test authenticated Spotify OAuth, returning sessions, revoked access, playback,
   and mobile playback using designated test accounts. The public smoke suite
   does not establish those integration behaviors.
3. Confirm recoverable database backups independently. Take an approved backup
   before applying migrations. Never test deletion RPCs against real user data.
4. Re-run read-only preflight queries for mismatched ranking ownership and duplicate
   UTC days. The migration intentionally fails rather than deleting or guessing
   how to repair historical inconsistencies.
5. Set server-only `SUPABASE_SERVICE_ROLE_KEY`, `SPOTIFY_CLIENT_ID`, and
   `SPOTIFY_CLIENT_SECRET` in the Next.js deployment. Set
   `NEXT_PUBLIC_APP_URL` to its canonical HTTPS origin. Keep the public Supabase URL
   and anon key. Never expose service or refresh credentials with `NEXT_PUBLIC_`.

## Coordinated release

Use a maintenance window. Deploy the new app with `MAINTENANCE_MODE=true`, which
returns an uncached 503 before auth or application writes. Pause the scheduled collector and prevent old web
instances from receiving traffic while changing database permissions. The old
callback reads/writes `spotify_connections` as the user; the repaired version uses
a server-only client. Applying the new permissions while serving the old app will
break reconnect and token-dependent requests.

1. Apply only the two September 2026 migration files, in filename order. Both use
   transactions. Review row ownership and UTC uniqueness failures before retrying.
2. Deploy the prepared Next.js build and updated `collect-snapshots` Edge Function
   including its shared modules. Keep `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`,
   and the existing dedicated collector secret in the function environment.
3. Set `MAINTENANCE_MODE=false`, redeploy, and restore the schedule. Verify login, reconnect, own/private/friend
   stats, snapshot completion, and playback with test accounts. The token endpoint
   must return `Cache-Control: private, no-store` and no refresh token.
4. Check collector `failed`, `deferred`, and retry information. Confirm snapshots
   and all ranking rows commit together, one per UTC day/time range. Check account
   operations only with designated disposable accounts.
5. Sync schema/types from the hosted project and review the generated changes.

Do not roll back the application alone after revoking client token-table access.
Prefer a forward repair with traffic paused. Restoring the old grants would
reintroduce the authorization defects. Restore data only through an explicitly
approved recovery procedure if a release has actually damaged it.

## Preflight SQL (read only)

```sql
SELECT 'artist_rankings' AS source, count(*) AS mismatches
FROM public.artist_rankings r JOIN public.snapshots s ON s.id=r.snapshot_id
WHERE r.user_id<>s.user_id
UNION ALL SELECT 'track_rankings',count(*)
FROM public.track_rankings r JOIN public.snapshots s ON s.id=r.snapshot_id
WHERE r.user_id<>s.user_id
UNION ALL SELECT 'album_rankings',count(*)
FROM public.album_rankings r JOIN public.snapshots s ON s.id=r.snapshot_id
WHERE r.user_id<>s.user_id;

SELECT user_id,time_range,(created_at AT TIME ZONE 'UTC')::date,count(*)
FROM public.snapshots GROUP BY 1,2,3 HAVING count(*)>1;
```

The September 5 read-only hosted preflight found zero ownership mismatches and
zero duplicate UTC-day groups. Those counts must be checked again at release.
