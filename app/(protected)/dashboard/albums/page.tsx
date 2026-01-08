import { getTopAlbums, getTopTracks } from "@/lib/spotify/api";
import { AlbumsList } from "@/components/albums-list";

export default async function AlbumsPage() {
  // Optimized: Fetch tracks first, then derive albums from tracks
  // This avoids redundant API calls since albums are extracted from tracks
  const [shortTermTracks, mediumTermTracks, longTermTracks] = await Promise.all([
    getTopTracks("short_term", 50),
    getTopTracks("medium_term", 50),
    getTopTracks("long_term", 50),
  ]);

  // Extract albums from already-fetched tracks (no additional API calls)
  const [shortTerm, mediumTerm, longTerm] = await Promise.all([
    getTopAlbums("short_term", 50, shortTermTracks),
    getTopAlbums("medium_term", 50, mediumTermTracks),
    getTopAlbums("long_term", 50, longTermTracks),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Top Albums</h1>
        <p className="text-muted-foreground">
          Albums from your most played tracks
        </p>
      </div>

      <AlbumsList 
        albumsByTimeRange={{
          short_term: shortTerm,
          medium_term: mediumTerm,
          long_term: longTerm,
        }}
      />
    </div>
  );
}
