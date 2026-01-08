"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { TimeRangeTabs } from "@/components/ui/time-range-tabs";
import { SpotifyIcon } from "@/components/ui/spotify-icon";
import { SparklineLoader, InlineSparkline } from "@/components/charts/sparkline-loader";
import { BLUR_DATA_URL } from "@/lib/constants";
import type { TimeRange } from "@/lib/spotify/types";

interface Artist {
  id: string;
  name: string;
  rank: number;
  imageUrl: string | null;
  genres: string[];
}

interface ArtistsListProps {
  artistsByTimeRange: {
    short_term: Artist[];
    medium_term: Artist[];
    long_term: Artist[];
  };
}

export function ArtistsList({ artistsByTimeRange }: ArtistsListProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("short_term");
  const artists = artistsByTimeRange[timeRange];

  return (
    <SparklineLoader itemIds={artists.map((artist) => artist.id)} type="artist">
      {(sparklines, loading) => (
        <TimeRangeTabs value={timeRange} onValueChange={setTimeRange} className="w-full">
          <TabsContent value={timeRange} className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {artists.map((artist, index) => (
                <Card key={artist.id} className="group overflow-hidden transition-all hover:shadow-lg flex flex-col p-0">
                  <Link href={`/dashboard/artists/${artist.id}`} className="relative h-64 w-full flex-shrink-0 block">
                    {artist.imageUrl ? (
                      <>
                        <Image
                          src={artist.imageUrl}
                          alt={artist.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                          loading={index < 8 ? "eager" : "lazy"}
                          priority={index < 4}
                          placeholder="blur"
                          blurDataURL={BLUR_DATA_URL.MEDIUM}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-30% via-card/40 via-60% to-card" />
                      </>
                    ) : (
                      <div className="h-full w-full bg-muted" />
                    )}
                  </Link>
                  <CardContent className="px-4 pt-3 pb-4 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl font-bold text-muted-foreground shrink-0">
                        {artist.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <Link href={`/dashboard/artists/${artist.id}`}>
                          <p className="truncate font-semibold text-lg">{artist.name}</p>
                        </Link>
                      </div>
                      <InlineSparkline itemId={artist.id} sparklines={sparklines} loading={loading} />
                    </div>
                    {artist.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {artist.genres.slice(0, 2).map((genre) => (
                          <Badge key={genre} variant="secondary" className="text-xs">
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <a
                      href={`https://open.spotify.com/artist/${artist.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-full transition-colors text-sm font-medium mt-auto"
                    >
                      <SpotifyIcon className="h-4 w-4" />
                      Open in Spotify
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </TimeRangeTabs>
      )}
    </SparklineLoader>
  );
}
