import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  SpotifyArtist,
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

class SpotifyAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public shouldRefresh: boolean = false
  ) {
    super(message);
    this.name = "SpotifyAPIError";
  }
}

async function getAccessToken(): Promise<string> {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    throw new SpotifyAPIError("No active session", 401, false);
  }

  const providerToken = session.provider_token;
  
  if (!providerToken) {
    // Try to refresh the session
    const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !refreshedSession.session?.provider_token) {
      throw new SpotifyAPIError("Unable to get Spotify access token. Please re-authenticate.", 401, true);
    }
    
    return refreshedSession.session.provider_token;
  }

  return providerToken;
}

// Cache Spotify API requests within the same React render
// This prevents duplicate API calls when multiple components request the same data
const spotifyFetch = cache(async <T,>(endpoint: string): Promise<T> => {
  const accessToken = await getAccessToken();

  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    // Add Next.js cache tags for better cache invalidation
    next: { 
      revalidate: 60, // Cache for 60 seconds
      tags: ['spotify-api']
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new SpotifyAPIError("Token expired", 401, true);
    }
    throw new SpotifyAPIError(
      `Spotify API error: ${response.statusText}`,
      response.status
    );
  }

  return response.json();
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

  return response.items.map((artist, index) => {
    // Prefer medium-sized images (index 1) for better performance
    // Spotify typically returns [large, medium, small]
    const imageUrl = artist.images[1]?.url ?? artist.images[0]?.url ?? null;
    
    return {
      rank: index + 1,
      id: artist.id,
      name: artist.name,
      imageUrl,
      genres: artist.genres,
      popularity: artist.popularity,
    };
  });
});

export const getTopTracks = cache(async (
  timeRange: TimeRange = "medium_term",
  limit: number = 50
): Promise<RankedTrack[]> => {
  const response = await spotifyFetch<SpotifyTopItemsResponse<SpotifyTrack>>(
    `/me/top/tracks?time_range=${timeRange}&limit=${limit}`
  );

  return response.items.map((track, index) => {
    // Prefer medium-sized images (index 1) for better performance
    const imageUrl = track.album.images[1]?.url ?? track.album.images[0]?.url ?? null;
    
    return {
      rank: index + 1,
      id: track.id,
      name: track.name,
      imageUrl,
      artistId: track.artists[0]?.id ?? "",
      artistName: track.artists.map((artist) => artist.name).join(", "),
      albumId: track.album.id,
      albumName: track.album.name,
      durationMs: track.duration_ms,
      popularity: track.popularity,
    };
  });
});

export function extractAlbumsFromTracks(tracks: RankedTrack[]): RankedAlbum[] {
  const albumMap = new Map<string, RankedAlbum>();

  tracks.forEach((track) => {
    const existing = albumMap.get(track.albumId);
    if (existing) {
      existing.trackCount += 1;
    } else {
      albumMap.set(track.albumId, {
        rank: 0, // Will be assigned after sorting
        id: track.albumId,
        name: track.albumName,
        imageUrl: track.imageUrl,
        artistId: track.artistId,
        artistName: track.artistName,
        releaseDate: "", // Not available from track data
        totalTracks: 0, // Not available from track data
        trackCount: 1,
      });
    }
  });

  // Sort by track count (most tracks first) and assign ranks
  const sortedAlbums = Array.from(albumMap.values())
    .sort((albumA, albumB) => albumB.trackCount - albumA.trackCount)
    .map((album, index) => ({
      ...album,
      rank: index + 1,
    }));

  return sortedAlbums;
}

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
    .sort((genreEntryA, genreEntryB) => genreEntryB[1].artists.size - genreEntryA[1].artists.size)
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

// Get user's top tracks from a specific artist
export const getArtistTopTracks = cache(async (
  artistId: string,
  timeRange: TimeRange = "medium_term",
  limit: number = 10
): Promise<RankedTrack[]> => {
  // Get all user's top tracks
  const allTopTracks = await getTopTracks(timeRange, 50);
  
  // Filter tracks by the specific artist
  const artistTracks = allTopTracks.filter(track => track.artistId === artistId);
  
  // Return limited number
  return artistTracks.slice(0, limit);
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
