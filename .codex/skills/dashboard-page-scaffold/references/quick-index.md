This skill scaffolds a protected dashboard page under `app/(protected)/dashboard/*` using existing repo patterns.

## Repo anchors

- Sidebar routes: `components/app-sidebar.tsx` (`navRoutes` array)
- Time-range tabs + sparklines wrapper: `components/time-range-list.tsx` (client)
- Existing list pages:
  - `app/(protected)/dashboard/artists/page.tsx`
  - `app/(protected)/dashboard/tracks/page.tsx`
  - `app/(protected)/dashboard/albums/page.tsx`
- Existing derived page:
  - `app/(protected)/dashboard/genres/page.tsx`
  - `app/(protected)/dashboard/genres/genres-page-client.tsx`
- Loading skeleton helpers:
  - `components/ui/loading-skeletons.tsx`
  - Example: `app/(protected)/dashboard/artists/loading.tsx`
- Spotify multi-time-range helpers:
  - `lib/spotify/helpers.ts` (`fetchArtistsByTimeRange()`, `fetchTracksByTimeRange()`, `fetchAlbumsByTimeRange()`)

## Templates in this skill

Open the relevant template from:
- `assets/templates/` (pages, client components, loading)
- `assets/snippets/` (sidebar route entry)

