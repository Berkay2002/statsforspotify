import { getTopAlbums } from "@/lib/spotify/api";
import type { TimeRange } from "@/lib/spotify/types";
import { AlbumsList } from "@/components/albums-list";

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

      <AlbumsList albums={albums} timeRange={timeRange} />
    </div>
  );
}
