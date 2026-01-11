import { fetchAlbumsByTimeRange } from "@/lib/spotify/helpers";
import { SpotifyAttribution } from "@/components/spotify-stats-logo";
import { AlbumsList } from "@/components/albums-list";

export default async function AlbumsPage() {
  const albumsByTimeRange = await fetchAlbumsByTimeRange(50);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Top Albums</h1>
          <p className="text-muted-foreground">
            Albums from your most played tracks
          </p>
        </div>
        <SpotifyAttribution className="hidden md:flex" />
      </div>

      <AlbumsList albumsByTimeRange={albumsByTimeRange} />
    </div>
  );
}
