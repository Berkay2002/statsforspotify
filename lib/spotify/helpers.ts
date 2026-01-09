import { getTopArtists, getTopTracks, getTopAlbums } from "./api";
import type { RankedArtist, RankedTrack, RankedAlbum } from "./types";
import { createClient } from "@/lib/supabase/server";

/**
 * Common type for items that can be fetched across time ranges
 */
export interface TimeRangeData<T> {
  short_term: T[];
  medium_term: T[];
  long_term: T[];
}

/**
 * Enriched types with previous_rank from database
 */
export interface RankedArtistWithPrevious extends RankedArtist {
  previous_rank: number | null;
}

export interface RankedTrackWithPrevious extends RankedTrack {
  previous_rank: number | null;
}

export interface RankedAlbumWithPrevious extends RankedAlbum {
  previous_rank: number | null;
}

/**
 * Fetches top artists for all three time ranges with rank change data
 * - Gets live Spotify rankings (current state)
 * - Fetches latest snapshot from database (previous state)
 * - Merges to show rank changes
 */
export async function fetchArtistsByTimeRange(limit: number = 50): Promise<TimeRangeData<RankedArtistWithPrevious>> {
  // Fetch live Spotify data
  const shortTerm = await getTopArtists("short_term", limit);
  
  const [mediumTerm, longTerm] = await Promise.all([
    getTopArtists("medium_term", limit),
    getTopArtists("long_term", limit),
  ]);

  // Fetch previous ranks from latest snapshots
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // No user, return without previous_rank
    return {
      short_term: shortTerm.map(a => ({ ...a, previous_rank: null })),
      medium_term: mediumTerm.map(a => ({ ...a, previous_rank: null })),
      long_term: longTerm.map(a => ({ ...a, previous_rank: null })),
    };
  }

  // Get latest snapshot IDs for each time range
  const { data: snapshots } = await supabase
    .from("snapshots")
    .select("id, time_range")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  if (!snapshots || snapshots.length === 0) {
    // No snapshots yet, return without previous_rank
    return {
      short_term: shortTerm.map(a => ({ ...a, previous_rank: null })),
      medium_term: mediumTerm.map(a => ({ ...a, previous_rank: null })),
      long_term: longTerm.map(a => ({ ...a, previous_rank: null })),
    };
  }

  // Create map of time_range -> snapshot_id
  const snapshotMap = snapshots.reduce((acc, snap) => {
    if (!acc[snap.time_range]) {
      acc[snap.time_range] = snap.id;
    }
    return acc;
  }, {} as Record<string, string>);

  // Fetch previous rankings in parallel
  const [prevShort, prevMedium, prevLong] = await Promise.all([
    snapshotMap.short_term
      ? supabase
          .from("artist_rankings")
          .select("artist_id, rank")
          .eq("snapshot_id", snapshotMap.short_term)
      : { data: null },
    snapshotMap.medium_term
      ? supabase
          .from("artist_rankings")
          .select("artist_id, rank")
          .eq("snapshot_id", snapshotMap.medium_term)
      : { data: null },
    snapshotMap.long_term
      ? supabase
          .from("artist_rankings")
          .select("artist_id, rank")
          .eq("snapshot_id", snapshotMap.long_term)
      : { data: null },
  ]);

  // Create lookup maps
  const prevShortMap = new Map(prevShort.data?.map(r => [r.artist_id, r.rank]) || []);
  const prevMediumMap = new Map(prevMedium.data?.map(r => [r.artist_id, r.rank]) || []);
  const prevLongMap = new Map(prevLong.data?.map(r => [r.artist_id, r.rank]) || []);

  // Merge live data with previous ranks
  return {
    short_term: shortTerm.map(a => ({ ...a, previous_rank: prevShortMap.get(a.id) ?? null })),
    medium_term: mediumTerm.map(a => ({ ...a, previous_rank: prevMediumMap.get(a.id) ?? null })),
    long_term: longTerm.map(a => ({ ...a, previous_rank: prevLongMap.get(a.id) ?? null })),
  };
}

/**
 * Fetches top tracks for all three time ranges with rank change data
 * - Gets live Spotify rankings (current state)
 * - Fetches latest snapshot from database (previous state)
 * - Merges to show rank changes
 */
export async function fetchTracksByTimeRange(limit: number = 50): Promise<TimeRangeData<RankedTrackWithPrevious>> {
  // Fetch live Spotify data
  const shortTerm = await getTopTracks("short_term", limit);
  
  const [mediumTerm, longTerm] = await Promise.all([
    getTopTracks("medium_term", limit),
    getTopTracks("long_term", limit),
  ]);

  // Fetch previous ranks from latest snapshots
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // No user, return without previous_rank
    return {
      short_term: shortTerm.map(t => ({ ...t, previous_rank: null })),
      medium_term: mediumTerm.map(t => ({ ...t, previous_rank: null })),
      long_term: longTerm.map(t => ({ ...t, previous_rank: null })),
    };
  }

  // Get latest snapshot IDs for each time range
  const { data: snapshots } = await supabase
    .from("snapshots")
    .select("id, time_range")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  if (!snapshots || snapshots.length === 0) {
    // No snapshots yet, return without previous_rank
    return {
      short_term: shortTerm.map(t => ({ ...t, previous_rank: null })),
      medium_term: mediumTerm.map(t => ({ ...t, previous_rank: null })),
      long_term: longTerm.map(t => ({ ...t, previous_rank: null })),
    };
  }

  // Create map of time_range -> snapshot_id
  const snapshotMap = snapshots.reduce((acc, snap) => {
    if (!acc[snap.time_range]) {
      acc[snap.time_range] = snap.id;
    }
    return acc;
  }, {} as Record<string, string>);

  // Fetch previous rankings in parallel
  const [prevShort, prevMedium, prevLong] = await Promise.all([
    snapshotMap.short_term
      ? supabase
          .from("track_rankings")
          .select("track_id, rank")
          .eq("snapshot_id", snapshotMap.short_term)
      : { data: null },
    snapshotMap.medium_term
      ? supabase
          .from("track_rankings")
          .select("track_id, rank")
          .eq("snapshot_id", snapshotMap.medium_term)
      : { data: null },
    snapshotMap.long_term
      ? supabase
          .from("track_rankings")
          .select("track_id, rank")
          .eq("snapshot_id", snapshotMap.long_term)
      : { data: null },
  ]);

  // Create lookup maps
  const prevShortMap = new Map(prevShort.data?.map(r => [r.track_id, r.rank]) || []);
  const prevMediumMap = new Map(prevMedium.data?.map(r => [r.track_id, r.rank]) || []);
  const prevLongMap = new Map(prevLong.data?.map(r => [r.track_id, r.rank]) || []);

  // Merge live data with previous ranks
  return {
    short_term: shortTerm.map(t => ({ ...t, previous_rank: prevShortMap.get(t.id) ?? null })),
    medium_term: mediumTerm.map(t => ({ ...t, previous_rank: prevMediumMap.get(t.id) ?? null })),
    long_term: longTerm.map(t => ({ ...t, previous_rank: prevLongMap.get(t.id) ?? null })),
  };
}

/**
 * Fetches top albums for all three time ranges with rank change data
 * - Gets live Spotify rankings (current state)
 * - Fetches latest snapshot from database (previous state)
 * - Merges to show rank changes
 */
export async function fetchAlbumsByTimeRange(limit: number = 50): Promise<TimeRangeData<RankedAlbumWithPrevious>> {
  // Fetch live Spotify data
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

  // Fetch previous ranks from latest snapshots
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // No user, return without previous_rank
    return {
      short_term: shortTerm.map(a => ({ ...a, previous_rank: null })),
      medium_term: mediumTerm.map(a => ({ ...a, previous_rank: null })),
      long_term: longTerm.map(a => ({ ...a, previous_rank: null })),
    };
  }

  // Get latest snapshot IDs for each time range
  const { data: snapshots } = await supabase
    .from("snapshots")
    .select("id, time_range")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  if (!snapshots || snapshots.length === 0) {
    // No snapshots yet, return without previous_rank
    return {
      short_term: shortTerm.map(a => ({ ...a, previous_rank: null })),
      medium_term: mediumTerm.map(a => ({ ...a, previous_rank: null })),
      long_term: longTerm.map(a => ({ ...a, previous_rank: null })),
    };
  }

  // Create map of time_range -> snapshot_id
  const snapshotMap = snapshots.reduce((acc, snap) => {
    if (!acc[snap.time_range]) {
      acc[snap.time_range] = snap.id;
    }
    return acc;
  }, {} as Record<string, string>);

  // Fetch previous rankings in parallel
  const [prevShort, prevMedium, prevLong] = await Promise.all([
    snapshotMap.short_term
      ? supabase
          .from("album_rankings")
          .select("album_id, rank")
          .eq("snapshot_id", snapshotMap.short_term)
      : { data: null },
    snapshotMap.medium_term
      ? supabase
          .from("album_rankings")
          .select("album_id, rank")
          .eq("snapshot_id", snapshotMap.medium_term)
      : { data: null },
    snapshotMap.long_term
      ? supabase
          .from("album_rankings")
          .select("album_id, rank")
          .eq("snapshot_id", snapshotMap.long_term)
      : { data: null },
  ]);

  // Create lookup maps
  const prevShortMap = new Map(prevShort.data?.map(r => [r.album_id, r.rank]) || []);
  const prevMediumMap = new Map(prevMedium.data?.map(r => [r.album_id, r.rank]) || []);
  const prevLongMap = new Map(prevLong.data?.map(r => [r.album_id, r.rank]) || []);

  // Merge live data with previous ranks
  return {
    short_term: shortTerm.map(a => ({ ...a, previous_rank: prevShortMap.get(a.id) ?? null })),
    medium_term: mediumTerm.map(a => ({ ...a, previous_rank: prevMediumMap.get(a.id) ?? null })),
    long_term: longTerm.map(a => ({ ...a, previous_rank: prevLongMap.get(a.id) ?? null })),
  };
}
