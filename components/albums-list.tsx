"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SparklineLoader, InlineSparkline } from "@/components/charts/sparkline-loader";
import type { TimeRange } from "@/lib/spotify/types";

interface Album {
  id: string;
  name: string;
  rank: number;
  imageUrl: string | null;
  artistName: string;
  trackCount: number;
}

interface AlbumsListProps {
  albumsByTimeRange: {
    short_term: Album[];
    medium_term: Album[];
    long_term: Album[];
  };
}

export function AlbumsList({ albumsByTimeRange }: AlbumsListProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("short_term");
  const albums = albumsByTimeRange[timeRange];

  return (
    <SparklineLoader itemIds={albums.map((a) => a.id)} type="album">
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {albums.map((album, index) => (
                <Link key={album.id} href={`/dashboard/albums/${album.id}`}>
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center">
                        <div className="self-start flex items-center gap-2">
                          <span className="text-lg font-bold text-muted-foreground">
                            {album.rank}
                          </span>
                          <InlineSparkline itemId={album.id} sparklines={sparklines} loading={loading} />
                        </div>
                        {album.imageUrl ? (
                          <Image
                            src={album.imageUrl}
                            alt={album.name}
                            width={120}
                            height={120}
                            className="rounded-lg object-cover shadow-md"
                            sizes="120px"
                            loading={index < 8 ? "eager" : "lazy"}
                            priority={index < 4}
                            placeholder="blur"
                            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzI3MjcyNyIvPjwvc3ZnPg=="
                          />
                        ) : (
                          <div className="h-[120px] w-[120px] rounded-lg bg-muted" />
                        )}
                        <div className="mt-3 w-full">
                          <p className="truncate font-semibold">{album.name}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {album.artistName}
                          </p>
                          <Badge variant="secondary" className="mt-2">
                            {album.trackCount} {album.trackCount === 1 ? "track" : "tracks"} in your top
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </SparklineLoader>
  );
}
