import { getTopTracks } from "@/lib/spotify/api";
import type { TimeRange } from "@/lib/spotify/types";
import { SpotifyAttribution } from "@/components/spotify-stats-logo";
import { TracksList } from "@/components/tracks-list";

interface PageProps {
  searchParams: Promise<{ time_range?: string }>;
}

export default async function TracksPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const timeRange = (params.time_range || "medium_term") as TimeRange;

  const tracks = await getTopTracks(timeRange, 50);

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

      <TracksList tracks={tracks} timeRange={timeRange} />
    </div>
  );
}
