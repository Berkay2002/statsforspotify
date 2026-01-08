import { fetchTracksByTimeRange } from "@/lib/spotify/helpers";
import { SpotifyAttribution } from "@/components/spotify-stats-logo";
import { TracksList } from "@/components/tracks-list";

export default async function TracksPage() {
  const tracksByTimeRange = await fetchTracksByTimeRange(50);

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

      <TracksList tracksByTimeRange={tracksByTimeRange} />
    </div>
  );
}
