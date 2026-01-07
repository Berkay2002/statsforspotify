## Plan: Spotify Stats Tracking App Implementation (Final)

Build a Spotify stats tracking app with local SQL migration files for Supabase, using Next.js route groups with a single root middleware for optimal auth protection. Dark mode default with toggle, Recharts for visualizations.

**Status: ✅ COMPLETE**

### Steps

1. ✅ **Install dependencies and configure Next.js** — Added `@supabase/supabase-js`, `@supabase/ssr`, `recharts` to `package.json`; updated `next.config.ts` with `images.remotePatterns` for `i.scdn.co`; created `.env.local.example` with required Supabase keys.

2. ✅ **Create SQL migration files** — Added `supabase/migrations/` folder with numbered files: `001_create_snapshots.sql`, `002_create_rankings.sql`, `003_create_indexes.sql`, `004_create_rls_policies.sql`, `005_create_functions.sql`, `006_setup_cron.sql`.

3. ✅ **Set up Supabase client utilities** — Created `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server components/actions), and `lib/supabase/middleware.ts` (session refresh helper).

4. ✅ **Configure root middleware with route groups** — Added `middleware.ts` at project root to refresh sessions and protect `/dashboard/*` and `/profile/*` routes; reorganized app into `app/(public)/` and `app/(protected)/`.

5. ✅ **Build authentication flow** — Created `components/login-dialog.tsx` with Spotify OAuth button (dialog UX instead of separate page), `app/(public)/auth/callback/route.ts` for OAuth code exchange, `app/(public)/auth/signout/route.ts` for logout.

6. ✅ **Create Spotify API layer** — Added `lib/spotify/types.ts` with TypeScript interfaces; added `lib/spotify/api.ts` with `getTopArtists()`, `getTopTracks()`, `getTopAlbums()`, `extractAlbumsFromTracks()`; includes token refresh error handling.

7. ✅ **Build dashboard with sidebar navigation** — Created `app/(protected)/dashboard/layout.tsx` using shadcn sidebar; added `components/app-sidebar.tsx` with nav links (Overview, Artists, Tracks, Albums), user avatar, and theme toggle.

8. ✅ **Implement ranking display and charts** — Built `app/(protected)/dashboard/page.tsx` with current top items; created list pages (`artists/`, `tracks/`, `albums/`) with time range tabs; added `[id]` detail pages with `components/charts/ranking-chart.tsx` Recharts LineChart.

9. ✅ **Create snapshot collection system** — Added `app/api/snapshot/route.ts` for manual triggers with rate limiting; created `supabase/functions/collect-snapshots/index.ts` Edge Function; included `006_setup_cron.sql` for pg_cron automation.

10. ✅ **Add profile and data management** — Created `app/(protected)/profile/page.tsx` with account info, data stats, export (JSON/CSV via `app/api/user/export/route.ts`), and full data deletion (`app/api/user/delete-data/route.ts`)—required for Spotify compliance.

### Implementation Notes

- **Login UX**: Used dialog (`LoginDialog`) instead of separate page for faster UX
- **Theme**: Dark mode set as default in `ThemeProvider`
- **Edge Functions**: Excluded from TypeScript build via `tsconfig.json` (Deno runtime)
- **pg_cron**: Enable via Supabase Dashboard > Integrations before running `006_setup_cron.sql`
