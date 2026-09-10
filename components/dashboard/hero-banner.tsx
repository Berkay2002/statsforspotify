"use client";

import { useId } from "react";
import { ArrowUpRight } from "lucide-react";
import { ArtworkBackground } from "@/components/ui/artwork-background";
import Image from "next/image";
import Link from "next/link";
import type { RankedArtistWithPrevious } from "@/lib/spotify/helpers";
import type { TimeRange } from "@/lib/spotify/types";
import { cn } from "@/lib/utils";
import { statsDetailHref } from "@/lib/stats/navigation";

function getMovementText(previous_rank: number | null, current_rank: number): string | null {
  if (previous_rank === null) return null;
  if (previous_rank === current_rank) return "holding steady";
  if (previous_rank > current_rank) return `up from #${previous_rank}`;
  return `down from #${previous_rank}`;
}

export function HeroBanner({ artist, timeRange, userId, label = "Your #1 Artist", compact = false, onViewAll }: {
  artist: RankedArtistWithPrevious;
  timeRange: TimeRange;
  userId?: string;
  label?: string;
  compact?: boolean;
  onViewAll?: () => void;
}) {
  const titleId = useId();
  const movement = getMovementText(artist.previous_rank, artist.rank);
  const isRise = artist.previous_rank !== null && artist.previous_rank > artist.rank;
  const isDrop = artist.previous_rank !== null && artist.previous_rank < artist.rank;

  return (
    <article
      className={cn(
        "group relative isolate flex items-end overflow-hidden rounded-3xl p-7 text-white sm:items-center sm:p-10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        compact ? "min-h-64" : "min-h-80 sm:min-h-88 lg:min-h-100",
      )}
    >
      <Link href={statsDetailHref("artist", artist.id, timeRange, userId)} aria-labelledby={titleId}
        className="absolute inset-0 z-10 rounded-3xl focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring" />
      <ArtworkBackground src={artist.imageUrl} sizes="640px"
        className="[&_img]:scale-110 [&_img]:blur-3xl [&_img]:opacity-50" />
      {artist.imageUrl && (
        <div className={cn(
          "absolute inset-y-0 right-0 w-full",
          compact ? "sm:aspect-square sm:h-full sm:w-auto" : "sm:w-88 lg:w-100",
        )}>
          <div aria-hidden="true" className="absolute -inset-y-8 -left-28 -right-8 hidden opacity-50 blur-3xl sm:block sm:[mask-image:linear-gradient(to_right,transparent,black_65%)]">
            <Image src={artist.imageUrl} alt="" fill sizes="512px" className="object-cover object-[center_30%]" />
          </div>
          <Image src={artist.imageUrl} alt={artist.name} fill
            sizes={compact ? "(min-width: 768px) 352px, (min-width: 640px) 256px, 100vw" : "(min-width: 1024px) 400px, (min-width: 640px) 352px, 100vw"}
            className="object-cover object-[center_30%] sm:brightness-90 sm:[mask-image:linear-gradient(to_right,transparent,rgba(0,0,0,0.08)_15%,rgba(0,0,0,0.35)_35%,rgba(0,0,0,0.75)_60%,black_90%)]" />
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-transparent sm:hidden" />
        </div>
      )}
      <div className="pointer-events-none relative z-20 min-w-0 max-w-2xl sm:max-w-[55%] lg:max-w-2xl">
        <p className="text-xs text-white/90 uppercase tracking-widest">
          {label}
        </p>
        <h2 id={titleId} className="text-4xl sm:text-5xl font-semibold tracking-tight mt-3 break-words">
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
        {onViewAll && (
          <button onClick={onViewAll}
            className="pointer-events-auto mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/25 bg-black/25 px-4 text-sm hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white">
            View all artists <ArrowUpRight className="size-4" />
          </button>
        )}
      </div>
    </article>
  );
}
