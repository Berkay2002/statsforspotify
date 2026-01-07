"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SparklineLoader, InlineSparkline } from "@/components/charts/sparkline-loader";
import type { TimeRange } from "@/lib/spotify/types";

interface Artist {
  id: string;
  name: string;
  rank: number;
  imageUrl: string | null;
  genres: string[];
}

interface ArtistsListProps {
  artists: Artist[];
  timeRange: TimeRange;
}

export function ArtistsList({ artists, timeRange }: ArtistsListProps) {
  return (
    <SparklineLoader itemIds={artists.map((a) => a.id)} type="artist">
      {(sparklines, loading) => (
        <Tabs defaultValue={timeRange} className="w-full">
          <TabsList>
            <TabsTrigger value="short_term" asChild>
              <Link href="?time_range=short_term">Last 4 Weeks</Link>
            </TabsTrigger>
            <TabsTrigger value="medium_term" asChild>
              <Link href="?time_range=medium_term">Last 6 Months</Link>
            </TabsTrigger>
            <TabsTrigger value="long_term" asChild>
              <Link href="?time_range=long_term">All Time</Link>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={timeRange} className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {artists.map((artist) => (
                <Card key={artist.id} className="group overflow-hidden transition-all hover:shadow-lg flex flex-col p-0">
                  <Link href={`/dashboard/artists/${artist.id}`} className="relative h-64 w-full flex-shrink-0 block">
                    {artist.imageUrl ? (
                      <>
                        <Image
                          src={artist.imageUrl}
                          alt={artist.name}
                          fill
                          className="object-cover"
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
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      Open in Spotify
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </SparklineLoader>
  );
}
