import { getTopArtists } from "@/lib/spotify/api";
import type { TimeRange } from "@/lib/spotify/types";
import { SpotifyAttribution } from "@/components/spotify-stats-logo";
import { ArtistsList } from "@/components/artists-list";

interface PageProps {
  searchParams: Promise<{ time_range?: string }>;
}

export default async function ArtistsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const timeRange = (params.time_range || "medium_term") as TimeRange;

  const artists = await getTopArtists(timeRange, 50);

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

      <ArtistsList artists={artists} timeRange={timeRange} />
    </div>
  );
}
