import { getTopGenres, getTopArtists } from "@/lib/spotify/api";
import type { RankedArtist, RankedGenre } from "@/lib/spotify/types";
import { GenresPageClient } from "./genres-page-client";

function withArtwork(genres: RankedGenre[], artists: RankedArtist[]) {
  return genres.map((genre) => ({
    ...genre,
    artistImages: artists
      .filter((artist) => artist.genres.includes(genre.name) && artist.imageUrl)
      .slice(0, 4)
      .map((artist) => ({ id: artist.id, name: artist.name, imageUrl: artist.imageUrl! })),
  }));
}

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
        short_term: withArtwork(shortTermGenres, shortTermArtists),
        medium_term: withArtwork(mediumTermGenres, mediumTermArtists),
        long_term: withArtwork(longTermGenres, longTermArtists),
      }}
    />
  );
}
