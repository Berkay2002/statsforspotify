import { fetchTracksByTimeRange } from "@/lib/spotify/helpers";
import { PageTitle } from "@/components/ui/page-title";
import { TracksList } from "@/components/tracks-list";

export default async function TracksPage() {
  const tracksByTimeRange = await fetchTracksByTimeRange(50);

  return (
    <div className="space-y-6">
      <TracksList tracksByTimeRange={tracksByTimeRange} leading={<PageTitle title="Top Tracks" description="Your most played songs on Spotify" />} />
    </div>
  );
}
