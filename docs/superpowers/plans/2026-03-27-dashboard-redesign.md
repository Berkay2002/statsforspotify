# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dense dashboard home page with a clean Hero + Highlights layout that's identity-forward, minimal, and shareable.

**Architecture:** Server component (`page.tsx`) fetches all data upfront, passes to a single `DashboardContent` client component that manages time-range tab state. Presentational child components (HeroBanner, HighlightCards, ThreeVersionsRedesigned, HallOfFameRedesigned) receive data via props. Three Versions and Hall of Fame are independent of tab state.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, shadcn/ui (Tabs, Card, Carousel), embla-carousel-react (already installed)

**Spec:** `docs/superpowers/specs/2026-03-27-dashboard-redesign.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `components/dashboard/dashboard-content.tsx` | Client component: tab state, layout orchestration |
| Create | `components/dashboard/hero-banner.tsx` | #1 artist display with image, name, movement |
| Create | `components/dashboard/highlight-cards.tsx` | Top Track, Top Album, Biggest Move cards |
| Create | `components/dashboard/three-versions-redesigned.tsx` | Redesigned Three Versions with carousel + shift callout |
| Create | `components/dashboard/hall-of-fame-redesigned.tsx` | Simplified Hall of Fame stat cards |
| Modify | `app/(protected)/dashboard/page.tsx` | Remove DashboardOverview, wire up new components |
| Modify | `app/(protected)/dashboard/loading.tsx` | Update skeleton to match new layout |

**Note:** Original recap components in `components/recaps/` are left intact (they may be used on other pages or in the future). We create new focused components in `components/dashboard/`.

---

### Task 1: Create HeroBanner Component

**Files:**
- Create: `components/dashboard/hero-banner.tsx`

- [ ] **Step 1: Create the HeroBanner component**

```tsx
// components/dashboard/hero-banner.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import type { RankedArtistWithPrevious } from "@/lib/spotify/helpers";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function getMovementText(previous_rank: number | null, current_rank: number): string | null {
  if (previous_rank === null) return null;
  if (previous_rank === current_rank) return "holding steady";
  if (previous_rank > current_rank) return `up from #${previous_rank}`;
  return `down from #${previous_rank}`;
}

export function HeroBanner({ artist }: { artist: RankedArtistWithPrevious }) {
  const movement = getMovementText(artist.previous_rank, artist.rank);
  const isRise = artist.previous_rank !== null && artist.previous_rank > artist.rank;
  const isDrop = artist.previous_rank !== null && artist.previous_rank < artist.rank;

  return (
    <Link
      href="/dashboard/artists"
      className="flex flex-col md:flex-row gap-5 items-center md:items-center group"
    >
      {/* Artist image */}
      {artist.imageUrl ? (
        <Image
          src={artist.imageUrl}
          alt={artist.name}
          width={120}
          height={120}
          className="rounded-lg object-cover w-[120px] h-[120px] flex-shrink-0"
        />
      ) : (
        <div className="w-[120px] h-[120px] rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-muted-foreground">
            {getInitials(artist.name)}
          </span>
        </div>
      )}

      {/* Artist info */}
      <div className="text-center md:text-left">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          Your #1 Artist
        </p>
        <h2 className="text-3xl font-bold mt-1 group-hover:underline decoration-1 underline-offset-4">
          {artist.name}
        </h2>
        {movement && (
          <p className="text-sm mt-1">
            <span
              className={
                isRise
                  ? "text-green-500"
                  : isDrop
                    ? "text-red-500"
                    : "text-muted-foreground"
              }
            >
              {isRise ? "↑ " : isDrop ? "↓ " : ""}
              {movement}
            </span>
          </p>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `bunx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `hero-banner.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/hero-banner.tsx
git commit -m "feat(dashboard): add HeroBanner component"
```

---

### Task 2: Create HighlightCards Component

**Files:**
- Create: `components/dashboard/highlight-cards.tsx`

- [ ] **Step 1: Create the HighlightCards component**

```tsx
// components/dashboard/highlight-cards.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import type { RankedTrackWithPrevious, RankedAlbumWithPrevious } from "@/lib/spotify/helpers";
import type { PlotTwistsRecap } from "@/components/recaps/plot-twists";
import type { RecapTimeRange } from "@/components/recaps/shared";

function getBiggestClimb(
  recap: PlotTwistsRecap | null,
  timeRange: RecapTimeRange
): { name: string; delta: number } | null {
  if (!recap) return null;
  const range = recap[timeRange];
  if (!range) return null;

  const allEvents = [...range.artists, ...range.albums];
  const climbs = allEvents.filter(
    (e) => e.event_type === "biggest_climb" && e.delta !== null
  );

  if (climbs.length === 0) return null;

  const biggest = climbs.reduce((best, curr) =>
    Math.abs(curr.delta!) > Math.abs(best.delta!) ? curr : best
  );

  return { name: biggest.item_name, delta: Math.abs(biggest.delta!) };
}

function Thumbnail({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={36}
        height={36}
        className="rounded w-9 h-9 object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded bg-muted flex-shrink-0" />
  );
}

export function HighlightCards({
  track,
  album,
  plotTwists,
  timeRange,
  hasSnapshots,
}: {
  track: RankedTrackWithPrevious;
  album: RankedAlbumWithPrevious;
  plotTwists: PlotTwistsRecap | null;
  timeRange: RecapTimeRange;
  hasSnapshots: boolean;
}) {
  const biggestClimb = getBiggestClimb(plotTwists, timeRange);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Top Track */}
      <Link
        href="/dashboard/tracks"
        className="bg-card rounded-xl border p-4 hover:bg-accent/50 transition-colors"
      >
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          Top Track
        </p>
        <div className="flex items-center gap-3">
          <Thumbnail src={track.imageUrl} alt={track.name} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{track.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              by {track.artistName}
            </p>
          </div>
        </div>
      </Link>

      {/* Top Album */}
      <Link
        href="/dashboard/albums"
        className="bg-card rounded-xl border p-4 hover:bg-accent/50 transition-colors"
      >
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          Top Album
        </p>
        <div className="flex items-center gap-3">
          <Thumbnail src={album.imageUrl} alt={album.name} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{album.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              by {album.artistName}
            </p>
          </div>
        </div>
      </Link>

      {/* Biggest Move */}
      <div className="bg-card rounded-xl border p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          Biggest Move
        </p>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-muted flex items-center justify-center flex-shrink-0">
            {biggestClimb ? (
              <span className="text-green-500 font-bold text-sm">↑</span>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
          </div>
          <div className="min-w-0">
            {biggestClimb ? (
              <>
                <p className="text-sm font-medium text-green-500">
                  ↑ {biggestClimb.delta} spots
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {biggestClimb.name}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {hasSnapshots ? "No changes this period" : "Collecting data..."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `bunx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `highlight-cards.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/highlight-cards.tsx
git commit -m "feat(dashboard): add HighlightCards component with thumbnails and biggest move"
```

---

### Task 3: Create ThreeVersionsRedesigned Component

**Files:**
- Create: `components/dashboard/three-versions-redesigned.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/dashboard/three-versions-redesigned.tsx
"use client";

import Image from "next/image";
import { type ThreeVersionsRecap } from "@/components/recaps/three-versions";
import {
  type RecapTimeRange,
  recapTimeRanges,
  recapTimeRangeLabels,
} from "@/components/recaps/shared";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { useCarouselDots } from "@/components/dashboard/use-carousel-dots";

type RankedRecapItem = {
  id: string;
  name: string;
  image_url: string | null;
  rank: number;
};

type RankedShiftItem = {
  id: string;
  name: string;
  image_url: string | null;
  short_rank: number;
  long_rank: number;
  delta: number;
};

function getLabel(
  itemId: string,
  constants: string[],
  uniqueShort: string[],
  uniqueMedium: string[],
  uniqueLong: string[],
  range: RecapTimeRange
): { text: string; isNew: boolean } {
  if (constants.includes(itemId)) return { text: "constant", isNew: false };
  if (range === "short_term" && uniqueShort.includes(itemId))
    return { text: "NEW", isNew: true };
  if (range === "medium_term" && uniqueMedium.includes(itemId))
    return { text: "unique", isNew: false };
  if (range === "long_term" && uniqueLong.includes(itemId))
    return { text: "unique", isNew: false };
  return { text: "", isNew: false };
}

function TimeRangePanel({
  range,
  items,
  recap,
}: {
  range: RecapTimeRange;
  items: RankedRecapItem[];
  recap: ThreeVersionsRecap;
}) {
  const { constants, unique_short, unique_medium, unique_long } = recap.artists;

  return (
    <div className="bg-card rounded-xl border p-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
        {recapTimeRangeLabels[range]}
      </p>
      <div className="flex flex-col gap-3">
        {items.slice(0, 3).map((item) => {
          const label = getLabel(
            item.id,
            constants,
            unique_short,
            unique_medium,
            unique_long,
            range
          );
          return (
            <div key={item.id} className="flex items-center gap-3">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  width={36}
                  height={36}
                  className="rounded-md w-9 h-9 object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-md bg-muted flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                {label.text && (
                  <p
                    className={`text-xs ${label.isNew ? "text-green-500" : "text-muted-foreground"}`}
                  >
                    {label.text}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BiggestShiftCallout({
  shifts,
}: {
  shifts: RankedShiftItem[];
}) {
  if (shifts.length === 0) return null;
  const biggest = shifts[0]; // Already sorted by delta from RPC

  return (
    <div className="flex items-center gap-2 flex-wrap px-4 py-3 bg-card/50 border rounded-xl text-sm">
      <span className="text-muted-foreground">Biggest shift:</span>
      {biggest.image_url ? (
        <Image
          src={biggest.image_url}
          alt={biggest.name}
          width={24}
          height={24}
          className="rounded w-6 h-6 object-cover"
        />
      ) : (
        <div className="w-6 h-6 rounded bg-muted" />
      )}
      <span className="font-medium">{biggest.name}</span>
      <span className="text-muted-foreground">went from</span>
      <span className="text-muted-foreground font-medium">
        #{biggest.long_rank} all-time
      </span>
      <span className="text-muted-foreground">to</span>
      <span className="text-green-500 font-semibold">
        #{biggest.short_rank} recent
      </span>
    </div>
  );
}

export function ThreeVersionsRedesigned({
  recap,
  hasSnapshots,
}: {
  recap: ThreeVersionsRecap | null;
  hasSnapshots: boolean;
}) {
  if (!hasSnapshots || !recap) {
    return (
      <div>
        <h3 className="text-lg font-bold">Three Versions of You</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          How your taste shifts across time ranges
        </p>
        <div className="bg-card rounded-xl border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Collecting your first snapshot… check back tomorrow
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-bold">Three Versions of You</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        How your taste shifts across time ranges
      </p>

      {/* Desktop: 3-column grid */}
      <div className="hidden md:grid md:grid-cols-3 gap-3 mb-3">
        {recapTimeRanges.map((range) => (
          <TimeRangePanel
            key={range}
            range={range}
            items={recap.artists[range]}
            recap={recap}
          />
        ))}
      </div>

      {/* Mobile: carousel */}
      <div className="md:hidden mb-3">
        <ThreeVersionsCarousel recap={recap} />
      </div>

      <BiggestShiftCallout
        shifts={recap.artists.biggest_shift_long_vs_short}
      />
    </div>
  );
}

function ThreeVersionsCarousel({ recap }: { recap: ThreeVersionsRecap }) {
  const { setApi, selectedIndex, scrollSnaps } = useCarouselDots();

  return (
    <div>
      <Carousel setApi={setApi} opts={{ align: "start" }}>
        <CarouselContent>
          {recapTimeRanges.map((range) => (
            <CarouselItem key={range}>
              <TimeRangePanel
                range={range}
                items={recap.artists[range]}
                recap={recap}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {scrollSnaps.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === selectedIndex ? "bg-foreground" : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the useCarouselDots hook**

```tsx
// components/dashboard/use-carousel-dots.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import type { CarouselApi } from "@/components/ui/carousel";

export function useCarouselDots() {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    setScrollSnaps(api.scrollSnapList());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  return { setApi, selectedIndex, scrollSnaps };
}
```

- [ ] **Step 3: Verify the files compile**

Run: `bunx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to the new files

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/three-versions-redesigned.tsx components/dashboard/use-carousel-dots.tsx
git commit -m "feat(dashboard): add ThreeVersionsRedesigned with mobile carousel and shift callout"
```

---

### Task 4: Create HallOfFameRedesigned Component

**Files:**
- Create: `components/dashboard/hall-of-fame-redesigned.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/dashboard/hall-of-fame-redesigned.tsx
"use client";

import { type HallOfFameRecap } from "@/components/recaps/hall-of-fame";

type StatCardData = {
  value: string;
  label: string;
  itemName: string;
};

function extractStats(recap: HallOfFameRecap): StatCardData[] {
  // Aggregate across all time ranges — pick the best value for each metric
  const ranges = ["short_term", "medium_term", "long_term"] as const;

  let bestNumberOneDays: StatCardData = { value: "—", label: "Most Days at #1", itemName: "" };
  let bestStreak: StatCardData = { value: "—", label: "Longest Streak", itemName: "" };
  let bestPeak: StatCardData = { value: "—", label: "Best Peak Rank", itemName: "" };
  let bestCharted: StatCardData = { value: "—", label: "Most Days Charted", itemName: "" };

  for (const range of ranges) {
    const data = recap[range];
    if (!data) continue;

    for (const entity of [data.artists, data.albums]) {
      if (entity.most_number_one_days) {
        const days = entity.most_number_one_days.number_one_days;
        if (bestNumberOneDays.value === "—" || days > parseInt(bestNumberOneDays.value)) {
          bestNumberOneDays = {
            value: String(days),
            label: "Most Days at #1",
            itemName: entity.most_number_one_days.name,
          };
        }
      }

      if (entity.longest_streak) {
        const days = entity.longest_streak.longest_streak_days;
        if (bestStreak.value === "—" || days > parseInt(bestStreak.value)) {
          bestStreak = {
            value: String(days),
            label: "Longest Streak",
            itemName: entity.longest_streak.name,
          };
        }
      }

      if (entity.best_peak_rank) {
        const rank = entity.best_peak_rank.peak_rank;
        if (bestPeak.value === "—" || rank < parseInt(bestPeak.value.replace("#", ""))) {
          bestPeak = {
            value: `#${rank}`,
            label: "Best Peak Rank",
            itemName: entity.best_peak_rank.name,
          };
        }
      }

      if (entity.most_days_charted && entity.most_days_charted.length > 0) {
        const top = entity.most_days_charted[0];
        if (bestCharted.value === "—" || top.days_charted > parseInt(bestCharted.value)) {
          bestCharted = {
            value: String(top.days_charted),
            label: "Most Days Charted",
            itemName: top.name,
          };
        }
      }
    }
  }

  return [bestNumberOneDays, bestStreak, bestPeak, bestCharted];
}

function StatCard({ stat }: { stat: StatCardData }) {
  return (
    <div className="bg-card rounded-xl border p-5 text-center">
      <p className="text-3xl font-extrabold">{stat.value}</p>
      <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
      {stat.itemName && (
        <p className="text-sm font-medium mt-2 truncate">{stat.itemName}</p>
      )}
    </div>
  );
}

export function HallOfFameRedesigned({
  recap,
  hasSnapshots,
}: {
  recap: HallOfFameRecap | null;
  hasSnapshots: boolean;
}) {
  if (!hasSnapshots || !recap) {
    return (
      <div>
        <h3 className="text-lg font-bold">Hall of Fame</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Your all-time achievements and streaks
        </p>
        <div className="bg-card rounded-xl border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Collecting your first snapshot… check back tomorrow
          </p>
        </div>
      </div>
    );
  }

  const stats = extractStats(recap);

  return (
    <div>
      <h3 className="text-lg font-bold">Hall of Fame</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Your all-time achievements and streaks
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `bunx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `hall-of-fame-redesigned.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/hall-of-fame-redesigned.tsx
git commit -m "feat(dashboard): add HallOfFameRedesigned with aggregated stat cards"
```

---

### Task 5: Create DashboardContent Client Wrapper

**Files:**
- Create: `components/dashboard/dashboard-content.tsx`

- [ ] **Step 1: Create the DashboardContent component**

```tsx
// components/dashboard/dashboard-content.tsx
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeroBanner } from "@/components/dashboard/hero-banner";
import { HighlightCards } from "@/components/dashboard/highlight-cards";
import { ThreeVersionsRedesigned } from "@/components/dashboard/three-versions-redesigned";
import { HallOfFameRedesigned } from "@/components/dashboard/hall-of-fame-redesigned";
import type { TimeRangeData, RankedArtistWithPrevious, RankedTrackWithPrevious, RankedAlbumWithPrevious } from "@/lib/spotify/helpers";
import type { ThreeVersionsRecap } from "@/components/recaps/three-versions";
import type { PlotTwistsRecap } from "@/components/recaps/plot-twists";
import type { HallOfFameRecap } from "@/components/recaps/hall-of-fame";
import type { TimeRange } from "@/lib/spotify/types";
import { recapTimeRangeLabels, type RecapTimeRange } from "@/components/recaps/shared";

const timeRangeKeys: RecapTimeRange[] = ["short_term", "medium_term", "long_term"];

export interface DashboardContentProps {
  artists: TimeRangeData<RankedArtistWithPrevious>;
  tracks: TimeRangeData<RankedTrackWithPrevious>;
  albums: TimeRangeData<RankedAlbumWithPrevious>;
  threeVersions: ThreeVersionsRecap | null;
  plotTwists: PlotTwistsRecap | null;
  hallOfFame: HallOfFameRecap | null;
  hasSnapshots: boolean;
}

export function DashboardContent({
  artists,
  tracks,
  albums,
  threeVersions,
  plotTwists,
  hallOfFame,
  hasSnapshots,
}: DashboardContentProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("medium_term");

  const currentArtist = artists[timeRange][0];
  const currentTrack = tracks[timeRange][0];
  const currentAlbum = albums[timeRange][0];

  if (!currentArtist || !currentTrack || !currentAlbum) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">No data available for this time range.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Time Range Tabs */}
      <Tabs
        value={timeRange}
        onValueChange={(v) => setTimeRange(v as TimeRange)}
      >
        <TabsList>
          {timeRangeKeys.map((key) => (
            <TabsTrigger key={key} value={key}>
              {recapTimeRangeLabels[key]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Hero */}
      <HeroBanner artist={currentArtist} />

      {/* Highlight Cards */}
      <HighlightCards
        track={currentTrack}
        album={currentAlbum}
        plotTwists={plotTwists}
        timeRange={timeRange}
        hasSnapshots={hasSnapshots}
      />

      {/* Divider */}
      <div className="border-t" />

      {/* Three Versions (independent of tab) */}
      <ThreeVersionsRedesigned
        recap={threeVersions}
        hasSnapshots={hasSnapshots}
      />

      {/* Divider */}
      <div className="border-t" />

      {/* Hall of Fame (independent of tab) */}
      <HallOfFameRedesigned
        recap={hallOfFame}
        hasSnapshots={hasSnapshots}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `bunx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `dashboard-content.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/dashboard-content.tsx
git commit -m "feat(dashboard): add DashboardContent client wrapper with tab state"
```

---

### Task 6: Rewire Dashboard Page (Server Component)

**Files:**
- Modify: `app/(protected)/dashboard/page.tsx`

- [ ] **Step 1: Replace the dashboard page**

Replace the entire contents of `app/(protected)/dashboard/page.tsx` with:

```tsx
// app/(protected)/dashboard/page.tsx
import { fetchAlbumsByTimeRange, fetchArtistsByTimeRange, fetchTracksByTimeRange } from "@/lib/spotify/helpers";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/login-dialog";
import { SpotifyAttribution } from "@/components/spotify-stats-logo";
import { AutoSnapshotTrigger } from "@/components/auto-snapshot-trigger";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { type ThreeVersionsRecap } from "@/components/recaps/three-versions";
import { type PlotTwistsRecap } from "@/components/recaps/plot-twists";
import { type HallOfFameRecap } from "@/components/recaps/hall-of-fame";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  let overviewError: string | null = null;
  let hasSnapshots = false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [
    { data: lastSnapshot },
    threeVersionsResult,
    plotTwistsResult,
    hallOfFameResult,
  ] = await Promise.all([
    supabase
      .from("snapshots")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.rpc("get_three_versions_of_you", {
      p_target_user_id: user.id,
      p_limit: 10,
    }),
    supabase.rpc("get_plot_twists_recap", {
      p_target_user_id: user.id,
      p_days: 30,
      p_limit: 20,
    }),
    supabase.rpc("get_hall_of_fame_recap", {
      p_target_user_id: user.id,
      p_days: 365,
      p_limit: 10,
    }),
  ]);

  if (lastSnapshot?.created_at) {
    hasSnapshots = true;
  }

  let artists, tracks, albums;
  try {
    [artists, tracks, albums] = await Promise.all([
      fetchArtistsByTimeRange(50),
      fetchTracksByTimeRange(50),
      fetchAlbumsByTimeRange(50),
    ]);
  } catch (e) {
    overviewError = e instanceof Error ? e.message : "Failed to load Overview";
  }

  const threeVersionsRecap = (threeVersionsResult.data ?? null) as ThreeVersionsRecap | null;
  const plotTwistsRecap = (plotTwistsResult.data ?? null) as PlotTwistsRecap | null;
  const hallOfFameRecap = (hallOfFameResult.data ?? null) as HallOfFameRecap | null;

  return (
    <>
      <AutoSnapshotTrigger />
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
            <p className="text-muted-foreground">Your top music on Spotify</p>
          </div>
          <SpotifyAttribution />
        </div>

        {overviewError || !artists || !tracks || !albums ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <p className="text-muted-foreground">
              {overviewError ?? "Failed to load Overview"}
            </p>
            <LoginDialog>
              <Button>Re-authenticate with Spotify</Button>
            </LoginDialog>
          </div>
        ) : (
          <DashboardContent
            artists={artists}
            tracks={tracks}
            albums={albums}
            threeVersions={threeVersionsRecap}
            plotTwists={plotTwistsRecap}
            hallOfFame={hallOfFameRecap}
            hasSnapshots={hasSnapshots}
          />
        )}
      </div>
    </>
  );
}
```

Key changes from current:
- Removed `AlbumTakeover` import and RPC call
- Removed `DashboardOverview` import
- Removed `lastSnapshotDate` display (cleaner header)
- Removed `.slice(0, 5)` — passes full data to `DashboardContent`
- Added `DashboardContent` with all data as props

- [ ] **Step 2: Verify it compiles**

Run: `bunx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Run the dev server and verify the page loads**

Run: `bun run dev` (in background)
Visit: `http://localhost:3000/dashboard`
Expected: New dashboard layout with hero, highlight cards, three versions, hall of fame

- [ ] **Step 4: Commit**

```bash
git add app/(protected)/dashboard/page.tsx
git commit -m "feat(dashboard): rewire page to use new DashboardContent layout"
```

---

### Task 7: Update Loading Skeleton

**Files:**
- Modify: `app/(protected)/dashboard/loading.tsx`

- [ ] **Step 1: Replace the loading skeleton**

Replace the entire contents of `app/(protected)/dashboard/loading.tsx` with:

```tsx
// app/(protected)/dashboard/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-80" />

      {/* Hero skeleton */}
      <div className="flex flex-col md:flex-row gap-5 items-center md:items-center">
        <Skeleton className="w-[120px] h-[120px] rounded-lg" />
        <div className="text-center md:text-left">
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Highlight cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-xl border p-4">
            <Skeleton className="h-3 w-20 mb-3" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded" />
              <div>
                <Skeleton className="h-4 w-28 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Three Versions skeleton */}
      <div>
        <Skeleton className="h-6 w-44 mb-1" />
        <Skeleton className="h-4 w-64 mb-4" />
        <div className="hidden md:grid md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border p-5">
              <Skeleton className="h-3 w-24 mb-4" />
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-3 mb-3">
                  <Skeleton className="w-9 h-9 rounded-md" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Hall of Fame skeleton */}
      <div>
        <Skeleton className="h-6 w-28 mb-1" />
        <Skeleton className="h-4 w-56 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-xl border p-5 text-center">
              <Skeleton className="h-9 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-20 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `bunx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/(protected)/dashboard/loading.tsx
git commit -m "feat(dashboard): update loading skeleton to match new layout"
```

---

### Task 8: Lint, Build, and Final Verification

**Files:**
- All files from Tasks 1-7

- [ ] **Step 1: Run lint**

Run: `bun run lint`
Expected: No errors (warnings are OK)

- [ ] **Step 2: Fix any lint issues**

If lint reports issues, fix them in the affected files.

- [ ] **Step 3: Run build**

Run: `bun run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Visual verification**

Run: `bun run dev`
Verify at `http://localhost:3000/dashboard`:
- [ ] Time range tabs appear and switch hero + highlight cards
- [ ] Hero shows #1 artist with image (or initials fallback) and movement text
- [ ] Highlight cards show top track (with thumbnail), top album (with thumbnail), biggest move
- [ ] Hero links to /dashboard/artists, track card to /dashboard/tracks, album card to /dashboard/albums
- [ ] Three Versions shows 3 panels with top 3 artists each, plus biggest shift callout
- [ ] Hall of Fame shows 4 stat cards
- [ ] Three Versions and Hall of Fame do NOT change when switching tabs
- [ ] Mobile viewport: hero stacks vertically, highlights stack, Three Versions becomes carousel with dots, Hall of Fame is 2x2 grid

- [ ] **Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "fix(dashboard): lint and build fixes"
```
