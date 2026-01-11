"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TopTracksSectionTrack {
  rank: number;
  id: string;
  name: string;
  imageUrl: string | null;
  subtitle: string;
  durationMs: number;
  popularity: number;
}

interface TopTracksSectionProps {
  title: string;
  tracks: TopTracksSectionTrack[];
  initialVisibleCount?: number;
  className?: string;
}

function formatDuration(durationMilliseconds: number) {
  const minutes = Math.floor(durationMilliseconds / 60000);
  const seconds = Math.floor((durationMilliseconds % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TopTracksSection({
  title,
  tracks,
  initialVisibleCount = 5,
  className,
}: TopTracksSectionProps) {
  const [showAllTracks, setShowAllTracks] = useState(false);

  const displayedTracks = useMemo(
    () => (showAllTracks ? tracks : tracks.slice(0, initialVisibleCount)),
    [initialVisibleCount, showAllTracks, tracks]
  );

  if (tracks.length === 0) return null;

  return (
    <div className={cn("px-6 pt-8", className)}>
      <h2 className="text-2xl font-bold mb-6">{title}</h2>

      <div className="space-y-1">
        {displayedTracks.map((track) => (
          <div
            key={track.id}
            className="rounded-lg hover:bg-accent/50 transition-colors cursor-pointer bg-transparent"
          >
            <div className="p-5">
              <div className="flex items-center gap-5">
                <div className="w-10 text-center">
                  <span className="text-xl font-semibold text-foreground">
                    {track.rank}
                  </span>
                </div>

                {track.imageUrl ? (
                  <Image
                    src={track.imageUrl}
                    alt={track.name}
                    width={64}
                    height={64}
                    className="rounded object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded bg-muted" />
                )}

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/dashboard/tracks/${track.id}`}
                    className="hover:underline"
                  >
                    <p className="text-base font-semibold truncate">
                      {track.name}
                    </p>
                  </Link>
                  <p className="text-base text-muted-foreground truncate mt-1">
                    {track.subtitle}
                  </p>
                </div>

                <Badge
                  variant="secondary"
                  className="hidden sm:inline-flex text-sm px-3 py-1"
                >
                  {track.popularity}% popularity
                </Badge>

                <div className="text-base text-muted-foreground tabular-nums">
                  {formatDuration(track.durationMs)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tracks.length > initialVisibleCount && (
        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => setShowAllTracks((currentValue) => !currentValue)}
          >
            {showAllTracks
              ? "Show Less"
              : `See More (${tracks.length - initialVisibleCount} more)`}
          </Button>
        </div>
      )}
    </div>
  );
}

