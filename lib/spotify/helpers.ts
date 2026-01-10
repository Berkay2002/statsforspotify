import { getTopArtists, getTopTracks, getTopAlbums } from "./api";
import type { RankedArtist, RankedTrack, RankedAlbum, TimeRange } from "./types";
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

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type TimeRangeMap<T> = Record<TimeRange, T>;

function addPreviousRank<TItem extends { id: string }>(
  items: TItem[],
  previousRankByItemId: Map<string, number>
): Array<TItem & { previous_rank: number | null }> {
  return items.map((item) => ({
    ...item,
    previous_rank: previousRankByItemId.get(item.id) ?? null,
  }));
}

async function fetchLatestSnapshotId(
  supabase: SupabaseServerClient,
  userId: string,
  timeRange: TimeRange
): Promise<string | null> {
  const { data: snapshot, error } = await supabase
    .from("snapshots")
    .select("id")
    .eq("user_id", userId)
    .eq("time_range", timeRange)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[helpers] Error fetching latest snapshot:", error);
    return null;
  }

  return snapshot?.id ?? null;
}

async function fetchLatestSnapshotIdsByTimeRange(
  supabase: SupabaseServerClient,
  userId: string
): Promise<Partial<Record<TimeRange, string>>> {
  const [shortTermId, mediumTermId, longTermId] = await Promise.all([
    fetchLatestSnapshotId(supabase, userId, "short_term"),
    fetchLatestSnapshotId(supabase, userId, "medium_term"),
    fetchLatestSnapshotId(supabase, userId, "long_term"),
  ]);

  return {
    ...(shortTermId ? { short_term: shortTermId } : {}),
    ...(mediumTermId ? { medium_term: mediumTermId } : {}),
    ...(longTermId ? { long_term: longTermId } : {}),
  };
}

async function fetchPreviousRankMapsByTimeRange(options: {
  supabase: SupabaseServerClient;
  userId: string;
  table: "artist_rankings" | "track_rankings" | "album_rankings";
  idColumn: "artist_id" | "track_id" | "album_id";
}): Promise<TimeRangeMap<Map<string, number>>> {
  const { supabase, userId, table, idColumn } = options;

  const snapshotIdsByTimeRange = await fetchLatestSnapshotIdsByTimeRange(supabase, userId);

  const [previousShort, previousMedium, previousLong] = await Promise.all([
    snapshotIdsByTimeRange.short_term
      ? supabase
          .from(table)
          .select(`${idColumn}, rank`)
          .eq("snapshot_id", snapshotIdsByTimeRange.short_term)
      : Promise.resolve({ data: null, error: null }),
    snapshotIdsByTimeRange.medium_term
      ? supabase
          .from(table)
          .select(`${idColumn}, rank`)
          .eq("snapshot_id", snapshotIdsByTimeRange.medium_term)
      : Promise.resolve({ data: null, error: null }),
    snapshotIdsByTimeRange.long_term
      ? supabase
          .from(table)
          .select(`${idColumn}, rank`)
          .eq("snapshot_id", snapshotIdsByTimeRange.long_term)
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (previousShort.error || previousMedium.error || previousLong.error) {
    console.error("[helpers] Error fetching previous ranks:", {
      short_term: previousShort.error,
      medium_term: previousMedium.error,
      long_term: previousLong.error,
    });
  }

  const shortTermMap = new Map<string, number>();
  for (const row of previousShort.data ?? []) {
    const itemId = (row as Record<string, unknown>)[idColumn];
    const rank = (row as Record<string, unknown>).rank;
    if (typeof itemId === "string" && typeof rank === "number") {
      shortTermMap.set(itemId, rank);
    }
  }

  const mediumTermMap = new Map<string, number>();
  for (const row of previousMedium.data ?? []) {
    const itemId = (row as Record<string, unknown>)[idColumn];
    const rank = (row as Record<string, unknown>).rank;
    if (typeof itemId === "string" && typeof rank === "number") {
      mediumTermMap.set(itemId, rank);
    }
  }

  const longTermMap = new Map<string, number>();
  for (const row of previousLong.data ?? []) {
    const itemId = (row as Record<string, unknown>)[idColumn];
    const rank = (row as Record<string, unknown>).rank;
    if (typeof itemId === "string" && typeof rank === "number") {
      longTermMap.set(itemId, rank);
    }
  }

  return {
    short_term: shortTermMap,
    medium_term: mediumTermMap,
    long_term: longTermMap,
  };
}

/**
 * Fetches top artists for all three time ranges with rank change data
 * - Gets live Spotify rankings (current state)
 * - Fetches latest snapshot from database (previous state)
 * - Merges to show rank changes
 */
export async function fetchArtistsByTimeRange(limit: number = 50): Promise<TimeRangeData<RankedArtistWithPrevious>> {
  const [shortTerm, mediumTerm, longTerm] = await Promise.all([
    getTopArtists("short_term", limit),
    getTopArtists("medium_term", limit),
    getTopArtists("long_term", limit),
  ]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      short_term: addPreviousRank(shortTerm, new Map()),
      medium_term: addPreviousRank(mediumTerm, new Map()),
      long_term: addPreviousRank(longTerm, new Map()),
    };
  }

  const previousRankMaps = await fetchPreviousRankMapsByTimeRange({
    supabase,
    userId: user.id,
    table: "artist_rankings",
    idColumn: "artist_id",
  });

  return {
    short_term: addPreviousRank(shortTerm, previousRankMaps.short_term),
    medium_term: addPreviousRank(mediumTerm, previousRankMaps.medium_term),
    long_term: addPreviousRank(longTerm, previousRankMaps.long_term),
  };
}

/**
 * Fetches top tracks for all three time ranges with rank change data
 * - Gets live Spotify rankings (current state)
 * - Fetches latest snapshot from database (previous state)
 * - Merges to show rank changes
 */
export async function fetchTracksByTimeRange(limit: number = 50): Promise<TimeRangeData<RankedTrackWithPrevious>> {
  const [shortTerm, mediumTerm, longTerm] = await Promise.all([
    getTopTracks("short_term", limit),
    getTopTracks("medium_term", limit),
    getTopTracks("long_term", limit),
  ]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      short_term: addPreviousRank(shortTerm, new Map()),
      medium_term: addPreviousRank(mediumTerm, new Map()),
      long_term: addPreviousRank(longTerm, new Map()),
    };
  }

  const previousRankMaps = await fetchPreviousRankMapsByTimeRange({
    supabase,
    userId: user.id,
    table: "track_rankings",
    idColumn: "track_id",
  });

  return {
    short_term: addPreviousRank(shortTerm, previousRankMaps.short_term),
    medium_term: addPreviousRank(mediumTerm, previousRankMaps.medium_term),
    long_term: addPreviousRank(longTerm, previousRankMaps.long_term),
  };
}

/**
 * Fetches top albums for all three time ranges with rank change data
 * - Gets live Spotify rankings (current state)
 * - Fetches latest snapshot from database (previous state)
 * - Merges to show rank changes
 */
export async function fetchAlbumsByTimeRange(limit: number = 50): Promise<TimeRangeData<RankedAlbumWithPrevious>> {
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      short_term: addPreviousRank(shortTerm, new Map()),
      medium_term: addPreviousRank(mediumTerm, new Map()),
      long_term: addPreviousRank(longTerm, new Map()),
    };
  }

  const previousRankMaps = await fetchPreviousRankMapsByTimeRange({
    supabase,
    userId: user.id,
    table: "album_rankings",
    idColumn: "album_id",
  });

  return {
    short_term: addPreviousRank(shortTerm, previousRankMaps.short_term),
    medium_term: addPreviousRank(mediumTerm, previousRankMaps.medium_term),
    long_term: addPreviousRank(longTerm, previousRankMaps.long_term),
  };
}
