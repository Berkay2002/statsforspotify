---
name: dashboard-page-scaffold
description: Scaffold a new protected dashboard page under app/(protected)/dashboard using existing TimeRangeList, spotify helpers, and sidebar nav patterns.
metadata:
  short-description: Add a dashboard page using repo conventions
---

You are working in a Next.js App Router repo with Supabase + Spotify helpers. This skill scaffolds a new protected dashboard page while reusing existing patterns and avoiding duplicated logic.

## Skill Resources (use via progressive disclosure)

When you need repo context, open only the relevant reference(s):

- `references/quick-index.md` (entry points to the main “source of truth” files)
- `references/page-shapes.md` (list vs derived vs detail guidance)
- `references/data-fetching.md` (preferred helper/API/DB order)
- `references/sidebar-nav.md` (how `navRoutes` works)
- `references/loading-ui.md` (loading skeleton conventions)

When you are ready to write code, start from templates and adapt:

- `assets/templates/` (page/list/detail/loading templates)
- `assets/snippets/nav-route-entry.ts.txt` (sidebar entry)

If the user wants validation and approves running commands:

- `scripts/validate.sh`

## Discovery Questions (ask first, keep it non-technical)

Assume the user may not know Next.js file structure, Server vs Client Components, or which helper to call. Your job is to ask a few general questions, infer a good default implementation, and then propose a concrete page spec for approval before writing code.

Ask these questions (in order), and stop as soon as you can propose a solid page spec:

1) What user-visible feature or outcome should this dashboard page provide? (1 sentence)
2) What kind of content is it closest to?
   - a time-range list (like Top Artists/Tracks/Albums)
   - a time-range summary/derived view (like Genres)
   - a detail view for a single item (like artist/track/album detail)
   - something else
3) Where does the data come from?
   - Spotify live API
   - Supabase database
   - both
4) What does the user need to do on the page?
   - just view
   - click into details
   - filter/search/sort
   - export/share
5) Do you want it in the sidebar navigation? (default: yes)
   - If yes: what label should appear in the sidebar?
   - If yes: any preferred icon (or “pick one for me”)?
6) What’s “enough data” for v1?
   - top 10 / top 50 / all
   - one time range or all three tabs
7) Any constraints?
   - performance concerns
   - privacy concerns
   - avoid extra Spotify API calls
   - must reuse an existing component if possible

If the user can answer more, optionally ask:
- Is there an existing dashboard page that should look/behave similarly?
- Should the URL be `/dashboard/<slug>` only, or also a detail route like `/dashboard/<slug>/[id]`?

If any answer is unknown, propose a sane default and ask for confirmation before writing files.

## Decision Policy (you choose “optimal defaults” when the user is unsure)

When the user cannot provide specifics, infer an initial page design and present 1 recommended option (and at most 1 alternative) for approval.

### Choose the page “shape”

- Time-range list of ranked items → `list`:
  - server `page.tsx` fetches `{ short_term, medium_term, long_term }`
  - client list component uses `TimeRangeList` for tabs + sparklines
- Derived time-range view → `derived`:
  - server `page.tsx` fetches all time ranges in parallel
  - small client component handles tab switching + rendering
- Detail view for one item → `detail`:
  - `app/(protected)/dashboard/<slug>/[id]/page.tsx`
  - server fetches detail data and renders

Default: `list` unless the user describes a “single item” page.

### Choose server vs client

- Default: Server Component for `page.tsx` (no `"use client"`).
- Add a client component only when you need:
  - hooks/state (filters, search input, sorting)
  - event handlers
  - browser APIs

### Choose data-fetching approach

Prefer these, in order:
1) Existing helpers in `lib/spotify/helpers.ts` (`fetchArtistsByTimeRange`, `fetchTracksByTimeRange`, `fetchAlbumsByTimeRange`)
2) Existing Spotify API functions in `lib/spotify/api.ts` (fetch in parallel across time ranges)
3) Supabase DB queries (use generated types if needed)

### Choose nav + loading defaults

- Sidebar: add to `components/app-sidebar.tsx` `navRoutes` by default.
- Loading UI: add `loading.tsx` by default using `PageHeaderLoading` and `TimeRangeTabsLoading`.

## Implementation Workflow

### 0) Propose the page spec (must-do)

Before creating files, propose a concrete spec based on the answers:
- route(s) to create (e.g., `/dashboard/<slug>`, optional `/dashboard/<slug>/[id]`)
- page shape (`list` / `derived` / `detail`)
- server vs client component split
- data source + which helper/API/DB query
- sidebar nav entry (title + icon)
- whether to add `loading.tsx`

Ask the user to confirm or adjust. Only then implement.

### 0.1) Choose a template (recommended)

After the user confirms the page spec, pick the closest template from `assets/templates/` and adapt it instead of starting from scratch. Prefer minimal diffs from existing repo patterns.

### 1) Locate the closest existing pattern

Open the most similar existing pages and follow their structure:
- List pages: `app/(protected)/dashboard/artists/page.tsx`, `app/(protected)/dashboard/tracks/page.tsx`, `app/(protected)/dashboard/albums/page.tsx`
- Mixed server/client pattern: `app/(protected)/dashboard/genres/page.tsx` and `app/(protected)/dashboard/genres/genres-page-client.tsx`
- Sidebar nav: `components/app-sidebar.tsx` (`navRoutes` array)
- Time range wrapper: `components/time-range-list.tsx`
- Loading patterns: `components/ui/loading-skeletons.tsx` and existing `app/(protected)/dashboard/*/loading.tsx`
- Spotify data helpers: `lib/spotify/helpers.ts`

### 2) Create the route files

Create `app/(protected)/dashboard/<slug>/page.tsx`.

Rules:
- Prefer a Server Component for `page.tsx` (no `"use client"`), fetching data on the server.
- Reuse `lib/spotify/helpers.ts` instead of duplicating time-range fetching logic.
- Use `@/` import aliases.
- Keep interactivity in a small co-located client component only if needed (e.g., `/<slug>/<slug>-page-client.tsx`).

Recommended patterns:
- For `list` pages, render an existing list component if it exists or create a new focused client list component that wraps `TimeRangeList`.
- For `derived` pages, follow Genres: server fetches all time ranges (often in parallel), then passes `{ short_term, medium_term, long_term }` into a client component.

### 3) Add loading UI (optional but recommended)

If user confirmed, add `app/(protected)/dashboard/<slug>/loading.tsx` following existing loading pages:
- Use `PageHeaderLoading` and `TimeRangeTabsLoading` from `components/ui/loading-skeletons.tsx`
- Match the layout style of similar pages

### 4) Update the dashboard sidebar nav

Edit `components/app-sidebar.tsx` and add a new entry to `navRoutes`:
- `id`: use the `slug`
- `title`: from user
- `href`: `/dashboard/<slug>`
- `icon`: lucide icon per user

### 5) Validation (only if the user approves running commands)

Run:
- `bun lint`
- `bun run build`

## Guardrails (follow strictly)

- Do not duplicate time range logic; prefer `TimeRangeList` and `lib/spotify/helpers.ts`.
- Avoid new `"use client"` at the page level; keep client components small and focused.
- Do not manually edit generated Supabase schema/type files.
- Use descriptive names (no abbreviations like `res`, `err`, `idx`) except simple loop counters.
