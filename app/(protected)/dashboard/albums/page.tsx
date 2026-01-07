import Image from "next/image";
import Link from "next/link";
import { getTopAlbums } from "@/lib/spotify/api";
import type { TimeRange } from "@/lib/spotify/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PageProps {
  searchParams: Promise<{ time_range?: string }>;
}

export default async function AlbumsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const timeRange = (params.time_range || "medium_term") as TimeRange;

  const albums = await getTopAlbums(timeRange, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Top Albums</h1>
        <p className="text-muted-foreground">
          Albums from your most played tracks
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
            {albums.map((album) => (
              <Link key={album.id} href={`/dashboard/albums/${album.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <span className="self-start text-lg font-bold text-muted-foreground">
                        {album.rank}
                      </span>
                      {album.imageUrl ? (
                        <Image
                          src={album.imageUrl}
                          alt={album.name}
                          width={120}
                          height={120}
                          className="rounded-lg object-cover shadow-md"
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
    </div>
  );
}
