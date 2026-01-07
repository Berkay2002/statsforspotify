import Image from "next/image";
import Link from "next/link";
import { getTopArtists } from "@/lib/spotify/api";
import type { TimeRange } from "@/lib/spotify/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PageProps {
  searchParams: Promise<{ time_range?: string }>;
}

export default async function ArtistsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const timeRange = (params.time_range || "medium_term") as TimeRange;

  const artists = await getTopArtists(timeRange, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Top Artists</h1>
        <p className="text-muted-foreground">
          Your most played artists on Spotify
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {artists.map((artist) => (
              <Link key={artist.id} href={`/dashboard/artists/${artist.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <span className="w-6 text-lg font-bold text-muted-foreground">
                        {artist.rank}
                      </span>
                      {artist.imageUrl ? (
                        <Image
                          src={artist.imageUrl}
                          alt={artist.name}
                          width={64}
                          height={64}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-semibold">{artist.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {artist.genres.slice(0, 2).map((genre) => (
                            <Badge key={genre} variant="secondary" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
