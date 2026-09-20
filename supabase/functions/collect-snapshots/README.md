# collect-snapshots

Edge Function that collects daily ranking snapshots for every connected Spotify account. It is the server-side counterpart to the in-app snapshot trigger, intended to run on a schedule.

## How it works

Refresh tokens live in a dedicated `spotify_connections` table rather than `auth.users.identities`, so connection state is queryable and debuggable without touching auth internals. Each row carries a status (`connected`, `revoked`, `error`), the last sync time, and the last error.

For every connected user, the function refreshes the access token, reads the top items for all three Spotify time ranges (`short_term`, `medium_term`, `long_term`), and writes one snapshot per user, date, and time range.

**Token refresh errors are classified**, not retried blindly:

| Class | Cause | Behaviour |
| --- | --- | --- |
| Revoked | The user revoked app access | Mark `revoked`, stop retrying |
| Rate limit | Spotify returned 429 | Respect the `Retry-After` header |
| Transient | Network or temporary failure | Retry on the next run |
| Fatal | Bad client credentials | Surface immediately |

**Snapshots are atomic.** If any ranking insert fails, the whole snapshot is deleted, so incomplete history never reaches the database. A unique constraint on user/date/time range makes reruns idempotent.

**Throughput is deliberately conservative** — `MAX_CONCURRENT_USERS = 2` with a 2s pause between batches and 500ms between time ranges, well under Spotify's 180 requests/minute, leaving headroom for the app itself. Raise it in `index.ts` if the user base grows and rate-limit headroom allows.

## Deploying

```bash
supabase functions deploy collect-snapshots
```

Requires `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in the function's environment.

## Scheduling

```sql
select cron.schedule(
  'collect-daily-snapshots',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://<your-project>.supabase.co/functions/v1/collect-snapshots',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## Operating

```sql
-- Connection health
select status, count(*), max(last_sync_at) from spotify_connections group by status;

-- Accounts needing attention
select user_id, status, last_error, last_sync_at
from spotify_connections
where status in ('revoked', 'error')
order by updated_at desc;

-- Today's collection
select time_range, count(*) from snapshots
where date(created_at) = current_date group by time_range;
```

No snapshots appearing? Check that `spotify_connections` has rows with `status = 'connected'` and non-null refresh tokens, then read the function logs. Users marked `revoked` disconnected the app on Spotify's side and are skipped until they log in again.

> [!CAUTION]
> Refresh tokens are credentials. `spotify_connections` has RLS enabled — only the service role can write, users can read only their own connection status, and tokens must never be logged or returned by an API route.
