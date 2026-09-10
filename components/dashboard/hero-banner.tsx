"use client";

import { ArtworkBackground } from "@/components/ui/artwork-background";
import Image from "next/image";
import Link from "next/link";
import type { RankedArtistWithPrevious } from "@/lib/spotify/helpers";
import type { TimeRange } from "@/lib/spotify/types";
import { statsDetailHref } from "@/lib/stats/navigation";

function getMovementText(previous_rank: number | null, current_rank: number): string | null {
  if (previous_rank === null) return null;
  if (previous_rank === current_rank) return "holding steady";
  if (previous_rank > current_rank) return `up from #${previous_rank}`;
  return `down from #${previous_rank}`;
}

export function HeroBanner({ artist, timeRange }: { artist: RankedArtistWithPrevious; timeRange: TimeRange }) {
  const movement = getMovementText(artist.previous_rank, artist.rank);
  const isRise = artist.previous_rank !== null && artist.previous_rank > artist.rank;
  const isDrop = artist.previous_rank !== null && artist.previous_rank < artist.rank;

  return (
    <Link
      href={statsDetailHref("artist", artist.id, timeRange)}
      className="group relative isolate flex min-h-80 items-end overflow-hidden rounded-3xl p-7 text-white sm:min-h-88 sm:items-center sm:p-10 lg:min-h-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <ArtworkBackground src={artist.imageUrl} sizes="640px"
        className="[&_img]:scale-110 [&_img]:blur-3xl [&_img]:opacity-50" />
      {artist.imageUrl && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-88 sm:[mask-image:linear-gradient(to_right,transparent,black_35%)] lg:w-100">
          <Image src={artist.imageUrl} alt={artist.name} fill
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 352px, 100vw"
            className="object-cover object-[center_30%]" />
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-transparent sm:hidden" />
        </div>
      )}
      <div className="relative z-10 min-w-0 max-w-2xl sm:max-w-[55%] lg:max-w-2xl">
        <p className="text-xs text-white/90 uppercase tracking-widest">
          Your #1 Artist
        </p>
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight mt-3 break-words">
          {artist.name}
        </h2>
        {movement && (
          <p className="text-sm mt-1">
            <span
              className={
                isRise
                  ? "text-emerald-300"
                  : isDrop
                    ? "text-rose-300"
                    : "text-white/90"
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
