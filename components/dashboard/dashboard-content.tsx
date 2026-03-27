"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  artists, tracks, albums, threeVersions, plotTwists, hallOfFame, hasSnapshots,
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
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
        <TabsList>
          {timeRangeKeys.map((key) => (
            <TabsTrigger key={key} value={key}>
              {recapTimeRangeLabels[key]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <HeroBanner artist={currentArtist} />

      <HighlightCards
        track={currentTrack}
        album={currentAlbum}
        plotTwists={plotTwists}
        timeRange={timeRange}
        hasSnapshots={hasSnapshots}
      />

      <Separator />

      <ThreeVersionsRedesigned recap={threeVersions} hasSnapshots={hasSnapshots} />

      <Separator />

      <HallOfFameRedesigned recap={hallOfFame} hasSnapshots={hasSnapshots} />
    </div>
  );
}
