## Preferred data fetching order

1) Use `lib/spotify/helpers.ts` time-range helpers when applicable:
   - `fetchArtistsByTimeRange(limit)`
   - `fetchTracksByTimeRange(limit)`
   - `fetchAlbumsByTimeRange(limit)`

2) If no helper exists, use `lib/spotify/api.ts` functions and fetch all time ranges in parallel.

3) Use Supabase DB queries only when needed.
   - If you need types, use generated DB types from `@/lib/supabase/database`.
   - Do not edit generated schema/type files manually.

## Time ranges

Use `TimeRange` values from `@/lib/spotify/types`:
- `short_term`
- `medium_term`
- `long_term`

