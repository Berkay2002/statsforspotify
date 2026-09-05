"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CombinedSparklineLoader } from "@/components/charts/combined-sparkline-loader";
import { InlineSparkline } from "@/components/charts/sparkline-loader";
import { ChevronRight } from "lucide-react";
import type { TimeRange } from "@/lib/spotify/types";

interface Artist {
  id: string;
  name: string;
  rank: number;
  imageUrl: string | null;
  genres: string[];
  previous_rank: number | null;
}

interface Track {
  id: string;
  name: string;
  rank: number;
  imageUrl: string | null;
  artistName: string;
  previous_rank: number | null;
}

interface Album {
  id: string;
  name: string;
  rank: number;
  imageUrl: string | null;
  artistId: string;
  previous_rank: number | null;
}

interface DashboardOverviewProps {
  dataByTimeRange: {
    short_term: {
      artists: Artist[];
      tracks: Track[];
      albums: Album[];
    };
    medium_term: {
      artists: Artist[];
      tracks: Track[];
      albums: Album[];
    };
    long_term: {
      artists: Artist[];
      tracks: Track[];
      albums: Album[];
    };
  };
}

export function DashboardOverview({ dataByTimeRange }: DashboardOverviewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("medium_term");
  const data = dataByTimeRange[timeRange];

  // Memoize IDs to prevent unnecessary re-renders and refetches
  // Only recalculate when the actual data changes, not on every render
  const artistIds = useMemo(() => data.artists.map(artist => artist.id), [data.artists]);
  const trackIds = useMemo(() => data.tracks.map(track => track.id), [data.tracks]);

  return (
    <CombinedSparklineLoader artistIds={artistIds} trackIds={trackIds} timeRange={timeRange}>
      {(sparklines, loading) => (
        <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)} className="w-full">
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

            <TabsContent value={timeRange} className="space-y-6 mt-6">
              {/* Top Items Preview */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* Top Artists */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Top Artists</CardTitle>
                      <CardDescription>Your most played artists</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/dashboard/artists">
                        View all
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.artists.map((artist) => (
                        <div key={artist.id} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
                          <span className="w-5 text-sm font-medium text-muted-foreground">
                            {artist.rank}
                          </span>
                          <Link
                            href={`/dashboard/artists/${artist.id}`}
                            className="flex items-center gap-3 flex-1 min-w-0"
                          >
                            {artist.imageUrl ? (
                              <Image
                                src={artist.imageUrl}
                                alt={artist.name}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-muted" />
                            )}
                            <div className="flex-1 truncate">
                              <p className="truncate font-medium">{artist.name}</p>
                              {artist.genres.length > 0 && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {artist.genres.slice(0, 2).join(", ")}
                                </p>
                              )}
                            </div>
                          </Link>
                          <InlineSparkline itemId={artist.id} sparklinesByItemId={sparklines} isLoading={loading} />
                          <a
                            href={`https://open.spotify.com/artist/${artist.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1DB954] hover:text-[#1ed760] transition-colors"
                            title="Open in Spotify"
                          >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                            </svg>
                          </a>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Tracks */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Top Tracks</CardTitle>
                      <CardDescription>Your most played songs</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/dashboard/tracks">
                        View all
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.tracks.map((track) => (
                        <div key={track.id} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
                          <span className="w-5 text-sm font-medium text-muted-foreground">
                            {track.rank}
                          </span>
                          <Link
                            href={`/dashboard/tracks/${track.id}`}
                            className="flex items-center gap-3 flex-1 min-w-0"
                          >
                            {track.imageUrl ? (
                              <Image
                                src={track.imageUrl}
                                alt={track.name}
                                width={40}
                                height={40}
                                className="rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-muted" />
                            )}
                            <div className="flex-1 truncate">
                              <p className="truncate font-medium">{track.name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {track.artistName}
                              </p>
                            </div>
                          </Link>
                          <InlineSparkline itemId={track.id} sparklinesByItemId={sparklines} isLoading={loading} />
                          <a
                            href={`https://open.spotify.com/track/${track.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1DB954] hover:text-[#1ed760] transition-colors"
                            title="Play on Spotify"
                          >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                            </svg>
                          </a>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Albums */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Top Albums</CardTitle>
                      <CardDescription>Your most played albums</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/dashboard/albums">
                        View all
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.albums.map((album) => (
                        <div key={album.id} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
                          <span className="w-5 text-sm font-medium text-muted-foreground">
                            {album.rank}
                          </span>
                          <Link
                            href={`/dashboard/albums/${album.id}`}
                            className="flex items-center gap-3 flex-1 min-w-0"
                          >
                            {album.imageUrl ? (
                              <Image
                                src={album.imageUrl}
                                alt={album.name}
                                width={40}
                                height={40}
                                className="rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-muted" />
                            )}
                            <div className="flex-1 truncate">
                              <p className="truncate font-medium">{album.name}</p>
                            </div>
                          </Link>
                          <InlineSparkline itemId={album.id} sparklinesByItemId={sparklines} isLoading={loading} />
                          <a
                            href={`https://open.spotify.com/album/${album.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1DB954] hover:text-[#1ed760] transition-colors"
                            title="Open in Spotify"
                          >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                            </svg>
                          </a>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
      )}
    </CombinedSparklineLoader>
  );
}
