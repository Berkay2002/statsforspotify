import Image from "next/image";
import Link from "next/link";
import { getTopArtists } from "@/lib/spotify/api";
import type { TimeRange } from "@/lib/spotify/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpotifyAttribution } from "@/components/spotify-stats-logo";

interface PageProps {
  searchParams: Promise<{ time_range?: string }>;
}

export default async function ArtistsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const timeRange = (params.time_range || "medium_term") as TimeRange;

  const artists = await getTopArtists(timeRange, 50);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Top Artists</h1>
          <p className="text-muted-foreground">
            Your most played artists on Spotify
          </p>
        </div>
        <SpotifyAttribution />
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
              <Card key={artist.id} className="transition-colors hover:bg-muted/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <span className="w-6 text-lg font-bold text-muted-foreground">
                        {artist.rank}
                      </span>
                      <Link href={`/dashboard/artists/${artist.id}`} className="flex-1 min-w-0">
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
                      </Link>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/dashboard/artists/${artist.id}`}>
                        <p className="truncate font-semibold">{artist.name}</p>
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {artist.genres.slice(0, 2).map((genre) => (
                          <Badge key={genre} variant="secondary" className="text-xs">
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <a
                      href={`https://open.spotify.com/artist/${artist.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-md transition-colors text-sm font-medium"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      Open in Spotify
                    </a>
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
