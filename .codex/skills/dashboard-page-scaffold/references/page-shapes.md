This repo uses a few common “dashboard page shapes”. Default to Server Components unless interactivity is required.

## Shape A: Time-range list (recommended default)

Use when you show “Top X” ranked items for each time range.

- Server `page.tsx`
  - Fetch items for 3 time ranges (prefer `lib/spotify/helpers.ts`)
  - Render a header + a client list component
- Client list component (in `components/`)
  - Wrap rendering in `TimeRangeList` (`components/time-range-list.tsx`)

Reference implementations:
- `app/(protected)/dashboard/artists/page.tsx` + `components/artists-list.tsx`
- `app/(protected)/dashboard/tracks/page.tsx` + `components/tracks-list.tsx`
- `app/(protected)/dashboard/albums/page.tsx` + `components/albums-list.tsx`

## Shape B: Derived time-range view

Use when the view is computed/aggregated and tab switching is primarily UI state (like Genres).

- Server `page.tsx`
  - Fetch all time ranges in parallel
  - Pass `{ short_term, medium_term, long_term }` into a client component
- Client page component
  - Owns `timeRange` state + rendering

Reference implementation:
- `app/(protected)/dashboard/genres/page.tsx`
- `app/(protected)/dashboard/genres/genres-page-client.tsx`

## Shape C: Detail view (`/dashboard/<slug>/[id]`)

Two common approaches:

1) Server-detail page:
   - Fetch data directly in `page.tsx`
   - Use `notFound()` when missing
   - Examples:
     - `app/(protected)/dashboard/tracks/[id]/page.tsx`
     - `app/(protected)/dashboard/albums/[id]/page.tsx`

2) Client-detail page:
   - Client component fetches from internal API routes
   - Example: `app/(protected)/dashboard/artists/[id]/page.tsx`

Pick server-detail when the data can be fetched server-side without complex client interactions.

