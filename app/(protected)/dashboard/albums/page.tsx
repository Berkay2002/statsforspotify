import { getTopAlbums } from "@/lib/spotify/api";
import { AlbumsList } from "@/components/albums-list";

export default async function AlbumsPage() {
  // Priority: Fetch default tab (short_term) first for faster initial render
  const shortTerm = await getTopAlbums("short_term", 50);
  
  // Background: Fetch other time ranges in parallel
  const [mediumTerm, longTerm] = await Promise.all([
    getTopAlbums("medium_term", 50),
    getTopAlbums("long_term", 50),
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
