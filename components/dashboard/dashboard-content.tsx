"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { TimeRangeTabsList } from "@/components/ui/time-range-tabs";
import { StickyBar } from "@/components/ui/sticky-bar";
import { Separator } from "@/components/ui/separator";
import { HeroBanner } from "@/components/dashboard/hero-banner";
import { HighlightCards } from "@/components/dashboard/highlight-cards";
import { ThreeVersionsRedesigned } from "@/components/dashboard/three-versions-redesigned";
import { HallOfFameRedesigned } from "@/components/dashboard/hall-of-fame-redesigned";
import type { TimeRangeData, RankedArtistWithPrevious, RankedTrackWithPrevious, RankedAlbumWithPrevious } from "@/lib/spotify/helpers";
import type { ThreeVersionsRecap } from "@/components/recaps/three-versions";
import type { PlotTwistsRecap } from "@/components/recaps/plot-twists";
import type { HallOfFameRecap } from "@/components/recaps/hall-of-fame";
import type { TimeRange } from "@/lib/spotify/types";

export interface DashboardContentProps {
  artists: TimeRangeData<RankedArtistWithPrevious>;
  tracks: TimeRangeData<RankedTrackWithPrevious>;
  albums: TimeRangeData<RankedAlbumWithPrevious>;
  threeVersions: ThreeVersionsRecap | null;
  plotTwists: PlotTwistsRecap | null;
  hallOfFame: HallOfFameRecap | null;
  hasSnapshots: boolean;
  /** Page title block for the sticky top bar. */
  leading?: React.ReactNode;
}

export function DashboardContent({
  artists, tracks, albums, threeVersions, plotTwists, hallOfFame, hasSnapshots, leading,
}: DashboardContentProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("medium_term");

  const currentArtist = artists[timeRange][0];
  const currentTrack = tracks[timeRange][0];
  const currentAlbum = albums[timeRange][0];

  if (!currentArtist || !currentTrack || !currentAlbum) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        {leading}
        <p className="text-muted-foreground">No data available for this time range.</p>
      </div>
    );
  }

  // Tabs wraps the whole page so the sticky range picker can follow the scroll to the bottom.
  return (
    <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)} className="gap-8">
      {/* Reserve the first desktop screen for the range tabs and featured music.
          The 8rem allowance covers the page heading and surrounding padding. */}
      <div className="flex flex-col gap-8 md:min-h-[calc(100svh-8rem)]">
        <StickyBar leading={leading}><TimeRangeTabsList /></StickyBar>

        <HeroBanner artist={currentArtist} timeRange={timeRange} />

        <HighlightCards
          track={currentTrack}
          album={currentAlbum}
          plotTwists={plotTwists}
          timeRange={timeRange}
          hasSnapshots={hasSnapshots}
        />
      </div>

      <Separator />

      <ThreeVersionsRedesigned recap={threeVersions} hasSnapshots={hasSnapshots} />

      <Separator />

      <HallOfFameRedesigned recap={hallOfFame} hasSnapshots={hasSnapshots} />
    </Tabs>
  );
}
