"use client";

import { useState } from "react";
import type { TimeRange } from "@/lib/spotify/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpotifyAttribution } from "@/components/spotify-stats-logo";
import { Music2 } from "lucide-react";

interface Genre {
  rank: number;
  name: string;
  artistCount: number;
  topArtists: string[];
}

interface GenresPageClientProps {
  genresByTimeRange: {
    short_term: Genre[];
    medium_term: Genre[];
    long_term: Genre[];
  };
}

export function GenresPageClient({ genresByTimeRange }: GenresPageClientProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("medium_term");
  const genres = genresByTimeRange[timeRange];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Top Genres</h1>
          <p className="text-muted-foreground">
            Genres from your most played artists
          </p>
        </div>
        <SpotifyAttribution />
      </div>

      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)} className="w-full">
        <TabsList>
          <TabsTrigger value="short_term">Last 4 Weeks</TabsTrigger>
          <TabsTrigger value="medium_term">Last 6 Months</TabsTrigger>
          <TabsTrigger value="long_term">All Time</TabsTrigger>
        </TabsList>

        <TabsContent value={timeRange} className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {genres.map((genre) => (
              <Card key={genre.name} className="transition-colors hover:bg-muted/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Music2 className="h-6 w-6 text-primary" />
                      </div>
                      <span className="text-lg font-bold text-muted-foreground">
                        #{genre.rank}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <CardTitle className="text-xl capitalize">{genre.name}</CardTitle>
                  </div>
                  
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {genre.artistCount} {genre.artistCount === 1 ? "artist" : "artists"}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Top Artists:
                    </p>
                    <p className="text-sm truncate">
                      {genre.topArtists.join(", ")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
