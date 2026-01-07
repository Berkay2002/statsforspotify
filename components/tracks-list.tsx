/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SparklineLoader, InlineSparkline } from "@/components/charts/sparkline-loader";
import type { TimeRange } from "@/lib/spotify/types";

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
  const [timeRange, setTimeRange] = useState<TimeRange>("short_term");
  const tracks = tracksByTimeRange[timeRange];

  return (
    <SparklineLoader itemIds={tracks.map((t) => t.id)} type="track">
      {(sparklines, loading) => (
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)} className="w-full">
          <TabsList>
            <TabsTrigger value="short_term">
              Last 4 Weeks
            </TabsTrigger>
            <TabsTrigger value="medium_term">
              Last 6 Months
            </TabsTrigger>
            <TabsTrigger value="long_term">
              All Time
            </TabsTrigger>
          </TabsList>

          <TabsContent value={timeRange} className="mt-6">
            <div className="space-y-2">
              {tracks.map((track, index) => (
                <div key={track.id} className="bg-transparent transition-colors hover:bg-muted/30 rounded-md">
                  <div className="p-3 px-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 flex flex-col items-center justify-center flex-shrink-0">
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
                            className="rounded-[4px] object-cover flex-shrink-0"
                            loading={index < 10 ? "eager" : "lazy"}
                            priority={index < 5}
                            placeholder="blur"
                            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMjcyNzI3Ii8+PC9zdmc+"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-[4px] bg-muted flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="truncate font-semibold text-base">{track.name}</p>
                          <p className="truncate text-sm text-muted-foreground max-w-[300px] sm:max-w-[400px] md:max-w-[500px]">
                            {track.artistName} • {track.albumName}
                          </p>
                        </div>
                      </Link>
                      <span className="text-sm text-muted-foreground flex-shrink-0 hidden sm:block">
                        {formatDuration(track.durationMs)}
                      </span>
                      <a
                        href={`https://open.spotify.com/track/${track.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1DB954] hover:text-[#1ed760] transition-colors p-2"
                        title="Play on Spotify"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </SparklineLoader>
  );
}
