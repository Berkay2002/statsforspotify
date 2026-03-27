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
