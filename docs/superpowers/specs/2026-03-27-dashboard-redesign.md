# Dashboard Redesign Spec

## Overview

Redesign the dashboard starting page to be cleaner, more identity-forward, and less overwhelming. Replace the current dense 3-column rankings grid + 4 recap sections with a focused Hero + Highlights layout.

**Visual direction:** Apple Music minimal — clean whitespace, album art as the star, elegant and restrained.

**Primary use cases:**
- "Did my taste change?" — movement and shifts should be visible
- "Show a friend" — the page should look share-worthy
- "Just make it cool" — delight on its own without a specific goal

## Page Structure

The page has three sections separated by subtle dividers. A time-range tab switcher at the top controls the hero and highlights sections. Three Versions and Hall of Fame are independent of the tab (they inherently show data across all time ranges).

### 1. Time Range Tabs

- Pill-style segmented control at the top of the page
- Options: **Last 4 Weeks** | **Last 6 Months** | **All Time**
- Switching tabs changes the **hero** and **highlight cards** only
- Three Versions and Hall of Fame are unaffected by tab selection (they display all ranges simultaneously)
- Replaces the current tab system in DashboardOverview

### 2. Hero — Your #1 Artist

- Large artist image (120px, rounded corners) on the left
- Right side:
  - Label: "YOUR #1 ARTIST" (uppercase, muted, letter-spaced)
  - Artist name: large, bold
  - Subtitle: "up from #Y" (movement from previous snapshot, using `previous_rank`). If `previous_rank` is null (no prior snapshot), omit the movement text.
- **Image fallback:** if `imageUrl` is null, show a muted placeholder with the artist's initials (first letter of first two words) centered in the 120px container
- No genre tags, no sparklines, no extra chrome — keep it minimal
- Data source: existing `fetchArtistsByTimeRange()` → first item per selected range

### 3. Highlight Cards Row

Three equal-width cards below the hero:

**Top Track**
- Label: "TOP TRACK" (uppercase, muted)
- 36px album art thumbnail + track name + "by Artist"
- Data source: `fetchTracksByTimeRange()` → first item

**Top Album**
- Label: "TOP ALBUM" (uppercase, muted)
- 36px album art thumbnail + album name + "by Artist"
- Data source: `fetchAlbumsByTimeRange()` → first item

**Biggest Move**
- Label: "BIGGEST MOVE" (uppercase, muted)
- 36px container with green arrow icon + "↑ N spots" in green + item name
- Data source: `get_plot_twists_recap` → for the selected time range, filter events where `event_type === "biggest_climb"`, combine artists and albums, pick the one with the largest absolute `delta`
- If `delta` is null on a climb event, skip it
- **Fallbacks (in order):**
  1. No snapshots yet → show "Collecting data..."
  2. Snapshots exist but no climb events → show "No changes this period"
- The card links to the full Artists or Tracks sub-page depending on the item type

### 4. Three Versions of You

Section title: "Three Versions of You"
Subtitle: "How your taste shifts across time ranges"

- Three equal-width panels side by side (desktop)
- Each panel: time range label + top 3 artists with 36px art + name
- Artists labeled "constant" (appears in all 3 ranges), "NEW" (green, only in this range), or "unique"
- **Biggest shift callout** below the panels: a single-line bar showing the artist who moved the most between short-term and all-time rankings (e.g., "Biggest shift: Artist A went from #47 all-time to #3 recent")
- Data source: existing `get_three_versions_of_you` RPC function
- **Mobile:** swipeable carousel with dot indicators, one panel per view

### 5. Hall of Fame

Section title: "Hall of Fame"
Subtitle: "Your all-time achievements and streaks"

- Four equal-width stat cards in a row
- Each card: large number (centered, bold) + metric label + artist/track name
- Metrics:
  1. **Most Days at #1** — count + artist name
  2. **Longest Streak** — count + artist name
  3. **Best Peak Rank** — rank + track name
  4. **Most Days Charted** — count + artist name
- Plain cards, no special styling accents
- Data source: existing `get_hall_of_fame_recap` RPC function
- **Mobile:** 2x2 grid

## Navigation to Sub-Pages

The current DashboardOverview's "View all" links are being removed. To maintain discoverability of the Artists, Tracks, and Albums sub-pages:

- **Hero artist** is clickable → navigates to `/dashboard/artists`
- **Top Track card** is clickable → navigates to `/dashboard/tracks`
- **Top Album card** is clickable → navigates to `/dashboard/albums`
- **Sidebar navigation** continues to link to all sub-pages (unchanged)

## What's Removed from the Dashboard

- **DashboardOverview component** — the 3-column grid of top 5 artists/tracks/albums with inline sparklines. This content moves to the dedicated Artists, Tracks, and Albums sub-pages (already exist at `/dashboard/artists`, `/dashboard/tracks`, `/dashboard/albums`).
- **Plot Twists recap** — full section removed. Distilled into the single "Biggest Move" highlight card.
- **Album Takeover recap** — removed entirely from the home page.
- **Inline sparkline charts** — removed from the dashboard. Still available on sub-pages.

## What's Kept (unchanged)

- **AutoSnapshotTrigger** — still fires silently on page load
- **Time range data fetching** — same Spotify API + Supabase calls with same limits (50 items). Only the *display* is reduced to top 1 for hero/highlights; the full dataset is still fetched because Three Versions needs top 3 and album rankings are derived from 50 tracks.
- **Error handling** — same pattern: error message + re-auth button on Spotify API failure
- **Loading state** — existing loading.tsx skeleton
- **Protected layout** — sidebar, mobile nav, floating player all unchanged

## Styling Guidelines

- Background: `#09090b` (existing dark background)
- Cards: `#161616` background, `1px solid #222` border, `rounded-xl` (12px) or `rounded-lg` (10px)
- Typography: existing font stack (Inter)
- Movement colors: green (`#22c55e`) for rises, red for drops, muted (`#888`) for neutral
- Labels: uppercase, muted color, letter-spacing
- Spacing: generous — this is a minimal design, let it breathe
- Use existing shadcn/ui primitives where applicable (Tabs, Card)

## Component Architecture

```
app/(protected)/dashboard/page.tsx (server component — fetches all data)
├── DashboardContent (client component — manages tab state, receives all data as props)
│   ├── Time range tabs (controls hero + highlights only)
│   ├── HeroBanner (presentational)
│   │   ├── Artist image (with initials fallback)
│   │   └── Artist info + movement
│   ├── HighlightCards (presentational)
│   │   ├── TopTrackCard (with thumbnail, links to /dashboard/tracks)
│   │   ├── TopAlbumCard (with thumbnail, links to /dashboard/albums)
│   │   └── BiggestMoveCard
│   ├── ThreeVersions (redesigned, independent of tab state)
│   │   ├── TimeRangePanel × 3
│   │   ├── BiggestShiftCallout
│   │   └── Mobile: SwipeableCarousel wrapper (embla-carousel)
│   └── HallOfFame (simplified, independent of tab state)
│       └── StatCard × 4
└── AutoSnapshotTrigger (unchanged)
```

**Note:** All components below `DashboardContent` are presentational (receive data via props). They are not server components — they live inside a client component boundary. `embla-carousel-react` is the recommended dependency for the mobile carousel (lightweight, React-native swipe support).

## Data Flow

1. Page loads → server component fetches Spotify rankings (50 per category per time range) + Supabase recap data in parallel
2. All data passed as props to child components
3. Time range tabs are client-side — switch which pre-fetched data set is displayed (no refetch on tab change, all 3 ranges fetched upfront)
4. AutoSnapshotTrigger fires in background, same as today

## Mobile Responsive Behavior

- **Hero:** stacks vertically (image above text) below `md` breakpoint
- **Highlight cards:** stack vertically, full width
- **Three Versions:** swipeable horizontal carousel with dot indicators (using `embla-carousel-react`)
- **Hall of Fame:** 2×2 grid
- **Time range tabs:** full width, same pill style

## Edge Cases

- **No snapshots yet (new user):** Hero and highlights render from live Spotify data. Three Versions and Hall of Fame show "Collecting your first snapshot... check back tomorrow" (existing pattern). Biggest Move shows "Collecting data..."
- **Spotify API error:** Same error state as today — message + re-auth button.
- **#1 hasn't changed:** The Biggest Move card provides freshness even when #1 is stable.
- **No climb events (snapshots exist but no movement):** Biggest Move card shows "No changes this period."
- **Artist image is null:** Hero shows a muted placeholder with the artist's initials (first letter of first two words) at 120px.
- **previous_rank is null:** Hero subtitle omits the movement text, shows just the artist name.
- **Individual RPC failures:** If a Supabase RPC fails but Spotify data succeeds, the affected section (Three Versions, Hall of Fame, or Biggest Move) shows its empty/fallback state. The page does not fail entirely.
