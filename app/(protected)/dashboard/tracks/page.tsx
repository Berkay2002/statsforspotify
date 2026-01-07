import { getTopTracks } from "@/lib/spotify/api";
import { SpotifyAttribution } from "@/components/spotify-stats-logo";
import { TracksList } from "@/components/tracks-list";

export default async function TracksPage() {
  // Priority: Fetch default tab (short_term) first for faster initial render
  const shortTerm = await getTopTracks("short_term", 50);
  
  // Background: Fetch other time ranges in parallel
  const [mediumTerm, longTerm] = await Promise.all([
    getTopTracks("medium_term", 50),
    getTopTracks("long_term", 50),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Top Tracks</h1>
          <p className="text-muted-foreground">
            Your most played songs on Spotify
          </p>
        </div>
        <SpotifyAttribution />
      </div>

      <TracksList 
        tracksByTimeRange={{
          short_term: shortTerm,
          medium_term: mediumTerm,
          long_term: longTerm,
        }}
      />
    </div>
  );
}
