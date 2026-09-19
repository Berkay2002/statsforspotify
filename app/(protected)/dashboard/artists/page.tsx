import { fetchArtistsByTimeRange } from "@/lib/spotify/helpers";
import { PageTitle } from "@/components/ui/page-title";
import { ArtistsList } from "@/components/artists-list";

export default async function ArtistsPage() {
  const artistsByTimeRange = await fetchArtistsByTimeRange(50);

  return (
    <div className="space-y-6">
      <ArtistsList artistsByTimeRange={artistsByTimeRange} leading={<PageTitle title="Top Artists" description="Your most played artists on Spotify" />} />
    </div>
  );
}
