import { getTopArtists } from "@/lib/spotify/api";
import { SpotifyAttribution } from "@/components/spotify-stats-logo";
import { ArtistsList } from "@/components/artists-list";

export default async function ArtistsPage() {
  // Fetch all time ranges in parallel for faster initial render
  // This reduces total wait time from sequential to parallel
  const [shortTerm, mediumTerm, longTerm] = await Promise.all([
    getTopArtists("short_term", 50),
    getTopArtists("medium_term", 50),
    getTopArtists("long_term", 50),
  ]);

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

      <ArtistsList 
        artistsByTimeRange={{
          short_term: shortTerm,
          medium_term: mediumTerm,
          long_term: longTerm,
        }}
      />
    </div>
  );
}
