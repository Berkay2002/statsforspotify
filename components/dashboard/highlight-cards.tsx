"use client";

import { ArtworkBackground } from "@/components/ui/artwork-background";
import Link from "next/link";
import type { RankedTrackWithPrevious, RankedAlbumWithPrevious } from "@/lib/spotify/helpers";
import type { PlotTwistsRecap } from "@/components/recaps/plot-twists";
import type { RecapTimeRange } from "@/components/recaps/shared";
import { statsDetailHref } from "@/lib/stats/navigation";

function getBiggestClimb(
  recap: PlotTwistsRecap | null,
  timeRange: RecapTimeRange
): { name: string; delta: number; imageUrl: string | null; href: string } | null {
  if (!recap) return null;
  const range = recap[timeRange];
  if (!range) return null;

  const allEvents = [
    ...range.artists.map((event) => ({ ...event, href: statsDetailHref("artist", event.item_id, timeRange) })),
    ...range.albums.map((event) => ({ ...event, href: statsDetailHref("album", event.item_id, timeRange) })),
  ];
  const climbs = allEvents.filter(
    (e) => e.event_type === "biggest_climb" && e.delta !== null
  );

  if (climbs.length === 0) return null;

  const biggest = climbs.reduce((best, curr) =>
    Math.abs(curr.delta!) > Math.abs(best.delta!) ? curr : best
  );

  return { name: biggest.item_name, delta: Math.abs(biggest.delta!), imageUrl: biggest.item_image_url, href: biggest.href };
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
    <div className="grid grid-cols-1 gap-4 md:flex-1 md:grid-cols-3 md:[&>*]:min-h-72">
      {[
        { label: "Top Track", item: track, href: statsDetailHref("track", track.id, timeRange) },
        { label: "Top Album", item: album, href: statsDetailHref("album", album.id, timeRange) },
      ].map(({ label, item, href }) => (
        <Link key={label} href={href}
          className="group relative isolate flex min-h-60 flex-col justify-between overflow-hidden rounded-3xl p-6 text-white ring-1 ring-inset ring-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <ArtworkBackground src={item.imageUrl} />
          <p className="relative text-xs font-medium uppercase tracking-widest text-white/90">{label}</p>
          <div className="relative min-w-0 pt-16">
            <p className="text-2xl font-semibold leading-tight tracking-tight break-words">{item.name}</p>
            <p className="mt-2 text-sm text-white/90">by {item.artistName}</p>
          </div>
        </Link>
      ))}
      <div className="group relative isolate flex min-h-60 flex-col justify-between overflow-hidden rounded-3xl p-6 text-white ring-1 ring-inset ring-white/10">
        {biggestClimb && (
          <Link href={biggestClimb.href}
            className="absolute inset-0 z-10 rounded-3xl focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring">
            <span className="sr-only">Biggest Move: {biggestClimb.name}, up {biggestClimb.delta} spots</span>
          </Link>
        )}
        <ArtworkBackground src={biggestClimb?.imageUrl} />
        <p className="relative text-xs font-medium uppercase tracking-widest text-white/90">Biggest Move</p>
        <div className="relative min-w-0 pt-16">
          {biggestClimb ? (
            <>
              <p className="text-3xl font-semibold tracking-tight">↑ {biggestClimb.delta} spots</p>
              <p className="mt-2 text-sm text-white/90 break-words">{biggestClimb.name}</p>
            </>
          ) : (
            <p className="text-sm text-white/90">
              {hasSnapshots ? "No changes this period" : "Collecting data..."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
