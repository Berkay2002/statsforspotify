import Link from "next/link";
import { getTopGenres } from "@/lib/spotify/api";
import type { TimeRange } from "@/lib/spotify/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music2 } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ time_range?: string }>;
}

export default async function GenresPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const timeRange = (params.time_range || "medium_term") as TimeRange;

  const genres = await getTopGenres(timeRange, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Top Genres</h1>
        <p className="text-muted-foreground">
          Genres from your most played artists
        </p>
      </div>

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
