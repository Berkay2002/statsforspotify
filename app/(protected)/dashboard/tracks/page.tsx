import Image from "next/image";
import Link from "next/link";
import { getTopTracks } from "@/lib/spotify/api";
import type { TimeRange } from "@/lib/spotify/types";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PageProps {
  searchParams: Promise<{ time_range?: string }>;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default async function TracksPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const timeRange = (params.time_range || "medium_term") as TimeRange;

  const tracks = await getTopTracks(timeRange, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Top Tracks</h1>
        <p className="text-muted-foreground">
          Your most played songs on Spotify
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
          <div className="space-y-2">
            {tracks.map((track) => (
              <Link key={track.id} href={`/dashboard/tracks/${track.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-4">
                      <span className="w-8 text-center text-lg font-bold text-muted-foreground">
                        {track.rank}
                      </span>
                      {track.imageUrl ? (
                        <Image
                          src={track.imageUrl}
                          alt={track.name}
                          width={48}
                          height={48}
                          className="rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-semibold">{track.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {track.artistName} • {track.albumName}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(track.durationMs)}
                      </span>
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
