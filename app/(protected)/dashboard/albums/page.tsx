import { fetchAlbumsByTimeRange } from "@/lib/spotify/helpers";
import { AlbumsList } from "@/components/albums-list";

export default async function AlbumsPage() {
  const albumsByTimeRange = await fetchAlbumsByTimeRange(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Top Albums</h1>
        <p className="text-muted-foreground">
          Albums from your most played tracks
        </p>
      </div>

      <AlbumsList albumsByTimeRange={albumsByTimeRange} />
    </div>
  );
}
