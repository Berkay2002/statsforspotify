import { cache } from "react";
import { SpotifyAPIError } from "./errors";
import { getAccessToken } from "./tokens";
import { normalizeTopArtists, normalizeTopTracks, extractAlbumsFromTracks, selectArtistTopTracks } from "./normalizers";
import type {
  SpotifyArtist,
  SpotifyAlbum,
  SpotifyTrack,
  SpotifyTopItemsResponse,
  SpotifyUser,
  TimeRange,
  RankedArtist,
  RankedTrack,
  RankedAlbum,
  RankedGenre,
} from "./types";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export { SpotifyAPIError } from "./errors";
export { getAccessToken } from "./tokens";

export async function spotifyRequest(endpoint: string, init: RequestInit = {}): Promise<Response> {
  if (!endpoint.startsWith("/") || endpoint.startsWith("//")) throw new Error("Invalid Spotify API endpoint");
  const accessToken = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  const send = () => fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...init,
    headers,
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });
  let response = await send();
  if (response.status === 401) {
    headers.set("Authorization", `Bearer ${await getAccessToken(true)}`);
    response = await send();
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new SpotifyAPIError("Token expired", 401, true);
    }
    throw new SpotifyAPIError(
      `Spotify API error: ${response.statusText}`,
      response.status
    );
  }

  return response;
}

// Deduplicate requests only within the current React render.
const spotifyFetch = cache(async <T,>(endpoint: string): Promise<T> => {
  return (await spotifyRequest(endpoint)).json();
});

// Wrap in cache() to deduplicate requests within the same render
export const getCurrentUser = cache(async (): Promise<SpotifyUser> => {
  return spotifyFetch<SpotifyUser>("/me");
});

export const getTopArtists = cache(async (
  timeRange: TimeRange = "medium_term",
  limit: number = 50
): Promise<RankedArtist[]> => {
  const response = await spotifyFetch<SpotifyTopItemsResponse<SpotifyArtist>>(
    `/me/top/artists?time_range=${timeRange}&limit=${limit}`
  );

  return normalizeTopArtists(response.items);
});

export const getTopTracks = cache(async (
  timeRange: TimeRange = "medium_term",
  limit: number = 50
): Promise<RankedTrack[]> => {
  const response = await spotifyFetch<SpotifyTopItemsResponse<SpotifyTrack>>(
    `/me/top/tracks?time_range=${timeRange}&limit=${limit}`
  );

  return normalizeTopTracks(response.items);
});

export { extractAlbumsFromTracks } from "./normalizers";

// Optimized: Accept pre-fetched tracks to avoid redundant API calls
export const getTopAlbums = cache(async (
  timeRange: TimeRange = "medium_term",
  limit: number = 50,
  prefetchedTracks?: RankedTrack[]
): Promise<RankedAlbum[]> => {
  const tracks = prefetchedTracks ?? await getTopTracks(timeRange, limit);
  return extractAlbumsFromTracks(tracks);
});

export function extractGenresFromArtists(artists: RankedArtist[]): RankedGenre[] {
  const genreMap = new Map<string, { trackCount: number; artists: Set<string> }>();

  artists.forEach((artist) => {
    artist.genres.forEach((genre) => {
      const existing = genreMap.get(genre);
      if (existing) {
        existing.artists.add(artist.name);
      } else {
        genreMap.set(genre, {
          trackCount: 0,
          artists: new Set([artist.name]),
        });
      }
    });
  });

  // Sort by artist count (most artists first) and assign ranks
  const sortedGenres = Array.from(genreMap.entries())
    .sort((firstGenreEntry, secondGenreEntry) => secondGenreEntry[1].artists.size - firstGenreEntry[1].artists.size)
    .map(([genreName, genreData], index) => ({
      rank: index + 1,
      name: genreName,
      trackCount: 0, // Not easily calculable without fetching all tracks per artist
      artistCount: genreData.artists.size,
      topArtists: Array.from(genreData.artists).slice(0, 3),
    }));

  return sortedGenres;
}

export const getTopGenres = cache(async (
  timeRange: TimeRange = "medium_term",
  limit: number = 50,
  prefetchedArtists?: RankedArtist[]
): Promise<RankedGenre[]> => {
  // Always fetch 50 artists for consistent genre rankings, or use pre-fetched
  const artists = prefetchedArtists ?? await getTopArtists(timeRange, 50);
  const allGenres = extractGenresFromArtists(artists);
  
  // Return only the requested number of top genres
  return allGenres.slice(0, limit);
});

// Get detailed artist information
export const getArtistDetails = cache(async (artistId: string): Promise<SpotifyArtist> => {
  return spotifyFetch<SpotifyArtist>(`/artists/${artistId}`);
});

export const getAlbumDetails = cache(async (albumId: string): Promise<SpotifyAlbum> => {
  return spotifyFetch<SpotifyAlbum>(`/albums/${albumId}`);
});

export const getTrackDetails = cache(async (trackId: string): Promise<SpotifyTrack> => {
  return spotifyFetch<SpotifyTrack>(`/tracks/${trackId}`);
});

// Get user's top tracks from a specific artist
export const getArtistTopTracks = cache(async (
  artistId: string,
  timeRange: TimeRange = "medium_term",
  limit: number = 10
): Promise<RankedTrack[]> => {
  const response = await spotifyFetch<SpotifyTopItemsResponse<SpotifyTrack>>(
    `/me/top/tracks?time_range=${timeRange}&limit=50`,
  );
  return selectArtistTopTracks(response.items, artistId, limit);
});

// Utility to check if we need to re-authenticate
export async function checkSpotifyConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    await getCurrentUser();
    return { connected: true };
  } catch (error) {
    if (error instanceof SpotifyAPIError) {
      return {
        connected: false,
        error: error.shouldRefresh
          ? "Session expired. Please sign in again."
          : error.message,
      };
    }
    return { connected: false, error: "Unknown error" };
  }
}
