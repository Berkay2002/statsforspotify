# Spotify Snapshots Cron Job - Migration Guide

## Overview

This is a production-ready refactor of the Spotify snapshots system. The system now uses a dedicated `spotify_connections` table for token management and implements proper error handling, concurrency control, and idempotency.

## Key Improvements

### 1. Dedicated Token Management
- **New Table**: `spotify_connections` stores refresh tokens separately from `auth.users.identities`
- **Better Control**: Track connection status (connected/revoked/error), last sync time, and errors
- **Operational Visibility**: Query and debug token issues without accessing auth internals

### 2. Token Refresh Error Classification
- **Revoked**: User revoked access → mark as `revoked`, stop retry attempts
- **Rate Limit**: Hit Spotify rate limits → respect Retry-After header
- **Transient**: Network/temporary issues → retry next run
- **Fatal**: Client credentials wrong → alert immediately

### 3. Concurrency Control
- **Batch Processing**: Process max 5 users concurrently to avoid rate limits
- **Delays**: 1 second pause between batches
- **Scalable**: Ready for growth without hitting API limits

### 4. Snapshot Integrity
- **Rollback on Failure**: If any ranking insert fails, entire snapshot is deleted
- **No Orphans**: Prevents corrupted/incomplete historical data
- **Atomic Operations**: All-or-nothing snapshot creation

### 5. Idempotency
- **Duplicate Prevention**: Won't create multiple snapshots for same user/date/time_range
- **Safe Reruns**: Cron can run multiple times without data corruption
- **Unique Constraint**: Database enforces uniqueness

### 6. All Time Ranges
Now captures all three Spotify time ranges:
- **short_term**: Last 4 weeks
- **medium_term**: Last 6 months  
- **long_term**: Several years

This enables future features like taste drift analysis and long-term trends.

## Migration Steps

### Step 1: Run SQL Migration

Execute the migration file in Supabase SQL Editor:

```sql
-- Run: supabase/migrations/20260109_create_spotify_connections.sql
```

This creates:
- `spotify_connections` table with RLS policies
- Indexes for performance
- Unique constraint on snapshots for idempotency
- Auto-update trigger for `updated_at`

### Step 2: Deploy Updated Edge Function

Deploy the new `index.ts` to Supabase:

```bash
supabase functions deploy collect-snapshots
```

Or manually copy/paste the contents of `supabase/functions/collect-snapshots/index.ts` into the Supabase dashboard.

### Step 3: Backfill Existing Users

For existing users, you need to populate `spotify_connections` table. You have two options:

**Option A: Wait for users to re-login**
- Auth callback now captures refresh tokens automatically
- Users will be added to `spotify_connections` on next login
- Simple but requires user action

**Option B: Run backfill script (recommended for production)**
- Create a one-time Edge Function to read tokens from `auth.users.identities`
- Migrate them to `spotify_connections`
- Mark all as `status = 'connected'`

Example backfill SQL (run as superuser):
```sql
INSERT INTO spotify_connections (user_id, refresh_token, status, connected_at)
SELECT 
  u.id as user_id,
  i.identity_data->>'provider_refresh_token' as refresh_token,
  'connected' as status,
  NOW() as connected_at
FROM auth.users u
JOIN auth.identities i ON i.user_id = u.id
WHERE i.provider = 'spotify'
  AND i.identity_data->>'provider_refresh_token' IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;
```

### Step 4: Update Cron Job (if needed)

Your existing pg_cron job should continue working. If you need to update it:

```sql
-- Drop old job (if exists)
SELECT cron.unschedule('collect-daily-snapshots');

-- Create new job
SELECT cron.schedule(
  'collect-daily-snapshots',
  '0 6 * * *', -- Run at 6 AM UTC daily
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/collect-snapshots',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### Step 5: Monitor First Run

After deployment:
1. Manually trigger the function to test
2. Check logs for any errors
3. Verify snapshots are created correctly
4. Check `spotify_connections.last_sync_at` is updating

## Configuration

### Concurrency Limit
Adjust `MAX_CONCURRENT_USERS` in `index.ts` based on your needs:
- Lower (3-5): More conservative, less risk of rate limits
- Higher (10-15): Faster processing, higher rate limit risk

### Time Ranges
Currently processes all three time ranges. To limit:
```typescript
const TIME_RANGES = ["medium_term"]; // Only process medium_term
```

## Monitoring

### Query Active Connections
```sql
SELECT 
  status,
  COUNT(*) as count,
  MAX(last_sync_at) as last_sync
FROM spotify_connections
GROUP BY status;
```

### Find Users with Errors
```sql
SELECT 
  user_id,
  status,
  last_error,
  last_sync_at
FROM spotify_connections
WHERE status IN ('revoked', 'error')
ORDER BY updated_at DESC;
```

### Check Today's Snapshots
```sql
SELECT 
  time_range,
  COUNT(*) as snapshot_count
FROM snapshots
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY time_range;
```

## Troubleshooting

### No snapshots being created
1. Check `spotify_connections` table has users with `status = 'connected'`
2. Verify refresh tokens are present
3. Check Edge Function logs for errors
4. Ensure `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are set

### Users marked as 'revoked'
- User disconnected their Spotify account
- They need to re-login to reconnect
- Cron will automatically skip these users

### Rate limiting errors
- Reduce `MAX_CONCURRENT_USERS`
- Increase delay between batches
- Consider spreading cron runs throughout the day

### Duplicate snapshot errors
- The unique constraint should prevent this
- If it happens, check if constraint was created properly
- Manually clean up duplicates and re-run migration

## Security Notes

- Refresh tokens are sensitive - `spotify_connections` has RLS enabled
- Only service role can write to `spotify_connections`
- Users can only read their own connection status
- Never log or expose refresh tokens

## Future Enhancements

Potential improvements:
- [ ] Add retry queue for rate-limited users
- [ ] Implement exponential backoff for failures
- [ ] Add metrics/monitoring dashboard
- [ ] Support partial time range collection
- [ ] Add webhook for user notification on revoked tokens
- [ ] Implement user-triggered manual sync

## Architecture Decisions

### Why separate `spotify_connections` table?
- `auth.users.identities` is managed by Supabase Auth
- Structure could change in future versions
- Need operational metadata (status, errors, last_sync)
- Want queryable, indexable token storage

### Why snapshot all time ranges?
- Enables future analytics features
- Minimal additional cost (3x API calls per user)
- Spotify API is stable and fast
- Historical data can't be recreated later

### Why rollback on failure?
- Prevents incomplete snapshots in history
- Maintains data integrity
- Makes debugging easier
- Snapshots should be atomic

### Why batch processing?
- Spotify rate limits: 180 requests/minute
- Need headroom for other app features
- Prevents thundering herd
- Scalable as user base grows
