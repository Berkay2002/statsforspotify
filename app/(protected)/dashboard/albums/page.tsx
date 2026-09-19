import { fetchAlbumsByTimeRange } from "@/lib/spotify/helpers";
import { PageTitle } from "@/components/ui/page-title";
import { AlbumsList } from "@/components/albums-list";

export default async function AlbumsPage() {
  const albumsByTimeRange = await fetchAlbumsByTimeRange(50);

  return (
    <div className="space-y-6">
      <AlbumsList albumsByTimeRange={albumsByTimeRange} leading={<PageTitle title="Top Albums" description="Albums from your most played tracks" />} />
    </div>
  );
}
