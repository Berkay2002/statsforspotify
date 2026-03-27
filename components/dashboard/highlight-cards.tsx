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

function Thumbnail({ src, alt }: { src: string | null; alt: string }) {
  if (src) {
    return (
      <Image src={src} alt={alt} width={36} height={36}
        className="rounded w-9 h-9 object-cover flex-shrink-0" />
    );
  }
  return <div className="w-9 h-9 rounded bg-muted flex-shrink-0" />;
}

export function HighlightCards({
  track, album, plotTwists, timeRange, hasSnapshots,
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
      <Link href="/dashboard/tracks"
        className="bg-card rounded-xl border p-4 hover:bg-accent/50 transition-colors">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Top Track</p>
        <div className="flex items-center gap-3">
          <Thumbnail src={track.imageUrl} alt={track.name} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{track.name}</p>
            <p className="text-xs text-muted-foreground truncate">by {track.artistName}</p>
          </div>
        </div>
      </Link>

      <Link href="/dashboard/albums"
        className="bg-card rounded-xl border p-4 hover:bg-accent/50 transition-colors">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Top Album</p>
        <div className="flex items-center gap-3">
          <Thumbnail src={album.imageUrl} alt={album.name} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{album.name}</p>
            <p className="text-xs text-muted-foreground truncate">by {album.artistName}</p>
          </div>
        </div>
      </Link>

      <div className="bg-card rounded-xl border p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Biggest Move</p>
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
                <p className="text-sm font-medium text-green-500">↑ {biggestClimb.delta} spots</p>
                <p className="text-xs text-muted-foreground truncate">{biggestClimb.name}</p>
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
