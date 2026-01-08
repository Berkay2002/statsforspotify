import { fetchArtistsByTimeRange } from "@/lib/spotify/helpers";
import { SpotifyAttribution } from "@/components/spotify-stats-logo";
import { ArtistsList } from "@/components/artists-list";

export default async function ArtistsPage() {
  const artistsByTimeRange = await fetchArtistsByTimeRange(50);

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

      <ArtistsList artistsByTimeRange={artistsByTimeRange} />
    </div>
  );
}
