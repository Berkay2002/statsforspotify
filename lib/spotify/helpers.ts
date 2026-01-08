import { getTopArtists, getTopTracks, getTopAlbums } from "./api";
import type { TimeRange } from "./types";

/**
 * Common type for items that can be fetched across time ranges
 */
export interface TimeRangeData<T> {
  short_term: T[];
  medium_term: T[];
  long_term: T[];
}

/**
 * Fetches top artists for all three time ranges
 * Optimized: short_term is fetched first for faster initial render
 */
export async function fetchArtistsByTimeRange(limit: number = 50): Promise<TimeRangeData<any>> {
  const shortTerm = await getTopArtists("short_term", limit);
  
  const [mediumTerm, longTerm] = await Promise.all([
    getTopArtists("medium_term", limit),
    getTopArtists("long_term", limit),
  ]);

  return {
    short_term: shortTerm,
    medium_term: mediumTerm,
    long_term: longTerm,
  };
}

/**
 * Fetches top tracks for all three time ranges
 * Optimized: short_term is fetched first for faster initial render
 */
export async function fetchTracksByTimeRange(limit: number = 50): Promise<TimeRangeData<any>> {
  const shortTerm = await getTopTracks("short_term", limit);
  
  const [mediumTerm, longTerm] = await Promise.all([
    getTopTracks("medium_term", limit),
    getTopTracks("long_term", limit),
  ]);

  return {
    short_term: shortTerm,
    medium_term: mediumTerm,
    long_term: longTerm,
  };
}

/**
 * Fetches top albums for all three time ranges
 * Optimized: Fetches tracks first to avoid redundant API calls
 */
export async function fetchAlbumsByTimeRange(limit: number = 50): Promise<TimeRangeData<any>> {
  const [shortTermTracks, mediumTermTracks, longTermTracks] = await Promise.all([
    getTopTracks("short_term", limit),
    getTopTracks("medium_term", limit),
    getTopTracks("long_term", limit),
  ]);

  const [shortTerm, mediumTerm, longTerm] = await Promise.all([
    getTopAlbums("short_term", limit, shortTermTracks),
    getTopAlbums("medium_term", limit, mediumTermTracks),
    getTopAlbums("long_term", limit, longTermTracks),
  ]);

  return {
    short_term: shortTerm,
    medium_term: mediumTerm,
    long_term: longTerm,
  };
}
