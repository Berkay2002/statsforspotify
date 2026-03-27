# Ranking History Chart Redesign

## Summary

Replace the current Recharts-based ranking history chart with a custom SVG + Motion implementation. The goal is to make it the best-looking, most informative component in the app — a showpiece with animated line drawing, rich annotations, streak highlights, and smooth interactions that match the app's premium dark-mode aesthetic.

## Motivation

The current chart is functional but visually generic. It doesn't match the editorial, Spotify-adjacent feel of the rest of the app (hero sections, bold display typography, vibrant accents). It's missing storytelling features — the data contains new entries, re-entries, and peak positions but the chart doesn't surface them visually.

## Approach

**Custom SVG + Motion** (Approach B from brainstorming). Full creative control over every pixel. No charting library — raw SVG for rendering, inline linear scale helpers for coordinate math, Motion for animations, shadcn Popover for annotation click targets.

**Why not Recharts?** Recharts fights back on animated line drawing (requires SVG hacks), custom annotation popovers, and glow effects. The chart is simple enough (single line, 10-50 points, one Y axis) that a library adds friction without value.

**Why not d3?** The only d3 feature needed is `d3-scale`, which is ~5 lines of code for a linear scale. Not worth the dependency.

## Architecture

### Component Structure

```
RankingHistoryLoader (existing wrapper — minimal changes)
  └── RankingChartV2 (new component)
        ├── SVG container with ResizeObserver
        ├── Defs: gradients, glow filter
        ├── Grid lines (horizontal only, dashed)
        ├── X/Y axis labels
        ├── Streak highlight regions
        ├── Peak reference line
        ├── Area fill (gradient under line)
        ├── AnimatedLine (line draw + glow)
        ├── Annotations (pulsing dots + Popover)
        └── HoverCursor (crosshair + tooltip)
```

### Data Flow

No API changes. The component receives the same props:
- `data: RankingHistory[]` — from `/api/rankings/history`
- `metadata: RankingHistoryMetadata` — peak, current rank, total snapshots, dates

All annotations and streaks are computed from existing data fields (`isNewEntry`, `isReentry`, `rank`). Note: `rankChange` is NOT on the `RankingHistory` type — it must be derived inside the component by comparing adjacent entries via `getRankDelta()` from `lib/rank-change.ts`, same as the current implementation.

### New Component Interface

```typescript
interface RankingChartProps {
  data: RankingHistory[];
  metadata: RankingHistoryMetadata;
  onAnimationComplete?: () => void;
}
```

This replaces the current props (`data`, `color`, `peakPosition`, `showPeakLabel`). The `metadata` prop replaces `peakPosition` — the chart reads `metadata.peakRank` directly. The `onAnimationComplete` callback lets the loader coordinate stats row animation.

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `components/charts/ranking-chart.tsx` | Replace | New custom SVG + Motion implementation |
| `components/charts/ranking-history-loader.tsx` | Edit | Pass `metadata` prop, animate stats row via `onAnimationComplete`, add legend |
| `app/globals.css` | Edit | Add `--chart-amber` variable to both light/dark themes |
| `app/demo/page.tsx` | Delete | Remove demo page after implementation |

### Files Unchanged

- `app/api/rankings/history/route.ts` — no API changes
- `lib/spotify/types.ts` — no type changes
- `lib/rank-change.ts` — still used for delta calculations
- `components/charts/ranking-badge.tsx` — still used in loader header
- `components/charts/rank-badge-inline.tsx` — unrelated
- All three detail pages (`artists/[id]`, `tracks/[id]`, `albums/[id]`) — they use `RankingHistoryLoader` which keeps its interface

## Visual Design

### Line & Fill

- **Animated line draw**: 1.8s duration, cubic bezier `[0.22, 1, 0.36, 1]`
- **Gradient stroke**: `--chart-4` (purple) → `--primary` (teal) → `--chart-1` (green) along X
- **Glow layer**: same path, 6px wide, 15% opacity, gaussian blur filter
- **Area fill**: gradient from 15% `--primary` at top to transparent at bottom, fades in after line draw
- **Smooth curves**: monotone cubic interpolation between points (not linear segments). Requires a `buildSmoothPath(points)` utility (~30-40 lines) that generates SVG cubic bezier `C` commands. Extract to `components/charts/chart-utils.ts`.

### Axes & Grid

- **Y-axis**: reversed (lower rank number = higher position on screen), `--font-mono`, `#N` format
- **X-axis**: "Mon D" date format, auto-thinned based on point count to prevent overlap
- **Grid**: horizontal only, dashed `2 4`, 50% opacity on `--border`
- **Domain**: dynamic, fits tightly to data range with 2-3 rank padding (not hardcoded 1-50)

### Colors

All via CSS variables for full theme support:
- **Line**: gradient using `--chart-4`, `--primary`, `--chart-1`
- **Peak/Streaks**: amber (`#f59e0b` — extract to `--chart-amber` in `globals.css` for both light/dark themes)
- **New entry**: `--chart-4` (purple)
- **Decline indicators**: `--destructive` (red)
- **Grid/axes**: `--border`, `--muted-foreground`

### Typography

- **Axis labels**: `--font-mono` (Roboto Mono), 11-12px
- **Tooltips/annotations**: `--font-sans` (Montserrat)
- **Consistent with app**: no new fonts introduced

## Interactions

### On Mount (animation sequence)

1. **0s**: Line begins drawing
2. **0.8s**: Area fill fades in
3. **1.2s+**: Annotation dots spring in (staggered per annotation)
4. **1.4s**: Peak reference line fades in
5. **1.6s**: Streak highlight regions fade in
6. **2.0s+**: Stats row staggers in from bottom

### On Hover

- Crosshair snaps to nearest data point (by X proximity)
- Spring-animated dot (`stiffness: 400, damping: 20`) at data point
- Floating tooltip above: rank number, change delta with color (+green/-red), "PEAK" badge
- Vertical dashed guide line from top to bottom
- Smooth spring transitions between points via `useSpring`

### Annotations (clickable)

Auto-derived from data, no manual config:

| Condition | Label | Color |
|-----------|-------|-------|
| `isNewEntry === true` | "Entered Chart" | `--chart-4` (purple) |
| `isReentry === true` | "Re-entered Chart" | `--chart-4` (purple) |
| `rank === peakRank` | "Peak #N" | amber |
| Biggest `rankChange >= 5` | "+N Jump" | `--chart-1` (green) |

Each annotation: pulsing ring animation (2s infinite loop) + solid dot. Click opens shadcn `Popover` with label + formatted date.

**Priority rules** (max one annotation per data point): Peak > New Entry > Re-entry > Big Jump. If a point matches multiple conditions, show only the highest-priority annotation.

### On Time Range Change

Component re-keys, full animation sequence replays.

## Streak Highlights

- **Top 5 streak**: amber gradient rectangle behind chart area for consecutive weeks at rank <= 5
- Gradient: 12% amber at top → transparent at bottom, `rx={4}` rounded corners
- "TOP 5" label in `--font-mono` at right edge, 10px, 70% opacity
- Fades in after line draw completes (1.6s delay)

## Stats Row

**Ownership**: stats row stays in `RankingHistoryLoader`. The chart fires `onAnimationComplete` when the line draw finishes, and the loader uses this signal to trigger the stats row fade-in. This keeps the chart focused on visualization and the loader focused on data/layout.

Same layout as current, animated:
- **Peak Position** (amber highlight when current === peak)
- **Current Rank**
- **Times Charted**
- **First Seen**
- Grid: `grid-cols-2 md:grid-cols-4`, gap-4
- Staggered fade-in + slide-up after chart animation

## Card Header

- Title: "Ranking History" with `RankingBadge` (existing)
- Time range select (existing, right-aligned)
- Small inline legend: colored dots for "Top 5 streak" (amber) and "Rank line" (primary)

## Dependencies

- **Added**: none (Motion already installed, no d3 needed)
- **Removed**: Recharts import from this component (Recharts stays in project — used by `sparkline-chart.tsx`)
- **Import convention**: use `motion` package (not `framer-motion`) for all new imports, consistent with v12 naming

## Edge Cases

- **Empty data**: show centered message (same as current)
- **Single point**: render as a dot with no line, no streaks
- **All points same rank**: flat line, no significant changes to annotate
- **Sparse data (2-3 points)**: show all X-axis labels, wider dot spacing
- **Dense data (30+ points)**: thin X-axis labels to every 3rd, smaller dots
- **No peak in view**: skip peak reference line and annotation
- **Mobile**: ResizeObserver handles responsive width. Tap on chart area shows crosshair tooltip, tap on annotation dot opens popover, tap elsewhere dismisses both.
- **Initial render**: before ResizeObserver fires, render the container at `100% width` / `420px height` via CSS but defer SVG content until dimensions are observed (avoids 0x0 flash)
- **Reduced motion**: respect `prefers-reduced-motion` — skip all animations, render final state immediately. Use Motion's built-in `useReducedMotion()` hook.
- **Multiple peaks**: if the same peak rank appears on multiple dates, annotate only the first occurrence

## Out of Scope

- Multi-entity comparison (overlay multiple artists) — future v2
- Time zoom/scrub — existing time range selector covers this
- Custom annotation input — all annotations are auto-derived
- D3 dependency — inline scale helpers are sufficient
