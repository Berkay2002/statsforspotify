/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Image from "next/image";
import Link from "next/link";
import { SpotifyIcon } from "@/components/ui/spotify-icon";
import { InlineSparkline } from "@/components/charts/sparkline-loader";
import { TimeRangeList } from "@/components/time-range-list";
import { BLUR_DATA_URL } from "@/lib/constants";

interface Track {
  id: string;
  name: string;
  rank: number;
  imageUrl: string | null;
  artistName: string;
  albumName: string;
  durationMs: number;
}

interface TracksListProps {
  tracksByTimeRange: {
    short_term: Track[];
    medium_term: Track[];
    long_term: Track[];
  };
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TracksList({ tracksByTimeRange }: TracksListProps) {
  return (
    <TimeRangeList
      itemsByTimeRange={tracksByTimeRange}
      itemType="track"
      className="w-full"
      renderItems={(tracks, sparklines, loading) => (
        <div className="space-y-2">
          {tracks.map((track, index) => (
            <div key={track.id} className="bg-transparent transition-colors hover:bg-muted/30 rounded-md">
              <div className="p-3 px-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 flex flex-col items-center justify-center shrink-0">
                    <InlineSparkline itemId={track.id} sparklines={sparklines} loading={loading} />
                    <span className="text-xl font-bold text-muted-foreground">
                      {track.rank}
                    </span>
                  </div>
                  <Link href={`/dashboard/tracks/${track.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    {track.imageUrl ? (
                      <Image
                        src={track.imageUrl}
                        alt={track.name}
                        width={64}
                        height={64}
                        className="rounded-lg object-cover shrink-0"
                        loading={index < 10 ? "eager" : "lazy"}
                        priority={index < 5}
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL.SMALL}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-muted shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="truncate font-semibold text-base">{track.name}</p>
                      <p className="truncate text-sm text-muted-foreground max-w-75 sm:max-w-100 md:max-w-125">
                        {track.artistName} • {track.albumName}
                      </p>
                    </div>
                  </Link>
                  <span className="text-sm text-muted-foreground shrink-0 hidden sm:block">
                    {formatDuration(track.durationMs)}
                  </span>
                  <a
                    href={`https://open.spotify.com/track/${track.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1DB954] hover:text-[#1ed760] transition-colors p-2"
                    title="Play on Spotify"
                  >
                    <SpotifyIcon />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    />
  );
}
