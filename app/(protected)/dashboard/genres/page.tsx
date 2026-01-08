import { getTopGenres, getTopArtists } from "@/lib/spotify/api";
import { GenresPageClient } from "./genres-page-client";

// Server component that fetches all time ranges in parallel
export default async function GenresPage() {
  // Optimized: Fetch all artists once, then derive genres for all time ranges
  const [shortTermArtists, mediumTermArtists, longTermArtists] = await Promise.all([
    getTopArtists("short_term", 50),
    getTopArtists("medium_term", 50),
    getTopArtists("long_term", 50),
  ]);

  // Extract genres from already-fetched artists (no additional API calls)
  const [shortTermGenres, mediumTermGenres, longTermGenres] = await Promise.all([
    getTopGenres("short_term", 50, shortTermArtists),
    getTopGenres("medium_term", 50, mediumTermArtists),
    getTopGenres("long_term", 50, longTermArtists),
  ]);

  return (
    <GenresPageClient
      genresByTimeRange={{
        short_term: shortTermGenres,
        medium_term: mediumTermGenres,
        long_term: longTermGenres,
      }}
    />
  );
}
