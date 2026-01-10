import { getTopArtists, getTopTracks, extractAlbumsFromTracks } from "@/lib/spotify/api";
import { NextResponse } from "next/server";
import { authenticateUser, unauthorizedResponse, serverErrorResponse } from "@/lib/api/utils";
import type { TimeRange, RankedArtist, RankedTrack, RankedAlbum } from "@/lib/spotify/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const TIME_RANGES: TimeRange[] = ["short_term", "medium_term", "long_term"];
const TIME_RANGE_DELAY_MS = 500; // 500ms delay between time ranges

// ============================================================================
// Helper: Calculate previous ranks
// ============================================================================

interface RankingsWithPrevious {
  artists: Array<{
    snapshot_id: string;
    user_id: string;
    artist_id: string;
    artist_name: string;
    artist_image_url: string | null;
    genres: string[];
    popularity: number | null;
    rank: number;
    previous_rank: number | null;
  }>;
  tracks: Array<{
    snapshot_id: string;
    user_id: string;
    track_id: string;
    track_name: string;
    track_image_url: string | null;
    artist_id: string;
    artist_name: string;
    album_id: string;
    album_name: string;
    duration_ms: number;
    popularity: number;
    rank: number;
    previous_rank: number | null;
  }>;
  albums: Array<{
    snapshot_id: string;
    user_id: string;
    album_id: string;
    album_name: string;
    album_image_url: string | null;
    artist_id: string;
    artist_name: string;
    track_count: number;
    rank: number;
    previous_rank: number | null;
  }>;
}

async function calculatePreviousRanks(
  supabase: SupabaseClient,
  userId: string,
  timeRange: TimeRange,
  snapshotId: string,
  artists: RankedArtist[],
  tracks: RankedTrack[],
  albums: RankedAlbum[]
): Promise<RankingsWithPrevious> {
  const startTime = Date.now();
  
  // Fetch previous snapshot for this time range (excluding current one)
  const { data: previousSnapshot } = await supabase
    .from("snapshots")
    .select("id")
    .eq("user_id", userId)
    .eq("time_range", timeRange)
    .neq("id", snapshotId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  
  if (!previousSnapshot) {
    console.log(`[Previous Rank] No previous snapshot for ${timeRange} - first snapshot`);
    return {
      artists: artists.map(artist => ({
        snapshot_id: snapshotId,
        user_id: userId,
        artist_id: artist.id,
        artist_name: artist.name,
        artist_image_url: artist.imageUrl,
        genres: artist.genres,
        popularity: artist.popularity,
        rank: artist.rank,
        previous_rank: null,
      })),
      tracks: tracks.map(track => ({
        snapshot_id: snapshotId,
        user_id: userId,
        track_id: track.id,
        track_name: track.name,
        track_image_url: track.imageUrl,
        artist_id: track.artistId,
        artist_name: track.artistName,
        album_id: track.albumId,
        album_name: track.albumName,
        duration_ms: track.durationMs,
        popularity: track.popularity,
        rank: track.rank,
        previous_rank: null,
      })),
      albums: albums.map(album => ({
        snapshot_id: snapshotId,
        user_id: userId,
        album_id: album.id,
        album_name: album.name,
        album_image_url: album.imageUrl,
        artist_id: album.artistId,
        artist_name: album.artistName,
        track_count: album.trackCount,
        rank: album.rank,
        previous_rank: null,
      })),
    };
  }
  
  // Fetch previous rankings in parallel
  const [prevArtists, prevTracks, prevAlbums] = await Promise.all([
    supabase
      .from("artist_rankings")
      .select("artist_id, rank")
      .eq("snapshot_id", previousSnapshot.id),
    supabase
      .from("track_rankings")
      .select("track_id, rank")
      .eq("snapshot_id", previousSnapshot.id),
    supabase
      .from("album_rankings")
      .select("album_id, rank")
      .eq("snapshot_id", previousSnapshot.id),
  ]);
  
  // Create lookup maps
  const artistRankMap = new Map(prevArtists.data?.map(r => [r.artist_id, r.rank]));
  const trackRankMap = new Map(prevTracks.data?.map(r => [r.track_id, r.rank]));
  const albumRankMap = new Map(prevAlbums.data?.map(r => [r.album_id, r.rank]));
  
  console.log(`[Previous Rank] Calculated in ${Date.now() - startTime}ms for ${timeRange}`);
  
  return {
    artists: artists.map(artist => ({
      snapshot_id: snapshotId,
      user_id: userId,
      artist_id: artist.id,
      artist_name: artist.name,
      artist_image_url: artist.imageUrl,
      genres: artist.genres,
      popularity: artist.popularity,
      rank: artist.rank,
      previous_rank: artistRankMap.get(artist.id) ?? null,
    })),
    tracks: tracks.map(track => ({
      snapshot_id: snapshotId,
      user_id: userId,
      track_id: track.id,
      track_name: track.name,
      track_image_url: track.imageUrl,
      artist_id: track.artistId,
      artist_name: track.artistName,
      album_id: track.albumId,
      album_name: track.albumName,
      duration_ms: track.durationMs,
      popularity: track.popularity,
      rank: track.rank,
      previous_rank: trackRankMap.get(track.id) ?? null,
    })),
    albums: albums.map(album => ({
      snapshot_id: snapshotId,
      user_id: userId,
      album_id: album.id,
      album_name: album.name,
      album_image_url: album.imageUrl,
      artist_id: album.artistId,
      artist_name: album.artistName,
      track_count: album.trackCount,
      rank: album.rank,
      previous_rank: albumRankMap.get(album.id) ?? null,
    })),
  };
}

// ============================================================================
// Helper: Create snapshot with rollback
// ============================================================================

async function createSnapshotWithRollback(
  supabase: SupabaseClient,
  userId: string,
  timeRange: TimeRange,
  artists: RankedArtist[],
  tracks: RankedTrack[],
  albums: RankedAlbum[]
): Promise<{ success: boolean; snapshotId?: string | null; error?: string }> {
  let snapshotId: string | null = null;
  
  try {
    // Create snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from("snapshots")
      .insert({ user_id: userId, time_range: timeRange })
      .select()
      .single();
    
    if (snapshotError || !snapshot) {
      throw new Error(`Snapshot creation failed: ${snapshotError?.message}`);
    }
    
    snapshotId = snapshot.id;
    
    // Calculate previous_rank (snapshotId is guaranteed to be non-null here)
    const rankingsWithPrevious = await calculatePreviousRanks(
      supabase, userId, timeRange, snapshotId as string, artists, tracks, albums
    );
    
    // Insert all rankings in parallel
    const results = await Promise.allSettled([
      supabase.from("artist_rankings").insert(rankingsWithPrevious.artists),
      supabase.from("track_rankings").insert(rankingsWithPrevious.tracks),
      supabase.from("album_rankings").insert(rankingsWithPrevious.albums),
    ]);
    
    // Check for failures
    const failures = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && r.value.error));
    if (failures.length > 0) {
      const errorMessages = failures.map(f => 
        f.status === "rejected" ? f.reason : (f as PromiseFulfilledResult<{ error: { message?: string } | null }>).value.error?.message
      ).join(", ");
      throw new Error(`Failed to insert rankings: ${errorMessages}`);
    }
    
    console.log(`[Snapshot] Successfully created snapshot ${snapshotId} for ${timeRange}`);
    return { success: true, snapshotId };
    
  } catch (error) {
    // ROLLBACK: Delete snapshot (CASCADE will clean up partial rankings)
    if (snapshotId) {
      const { error: rollbackError } = await supabase
        .from("snapshots")
        .delete()
        .eq("id", snapshotId);
      
      if (rollbackError) {
        console.error(`[Rollback] Failed to delete snapshot ${snapshotId}:`, rollbackError);
      } else {
        console.log(`[Rollback] Successfully deleted snapshot ${snapshotId}`);
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

export async function POST() {
  try {
    const authResult = await authenticateUser();
    if (!authResult) {
      return unauthorizedResponse();
    }

    const { user, supabase } = authResult;

    // ============================================================================
    // Check which time ranges already have snapshots TODAY
    // ============================================================================
    // Uses UTC calendar day to match database constraint and edge function logic
    // Allows partial collection (e.g., if only short_term exists, collect others)
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format (UTC)
    const { data: todaySnapshots } = await supabase
      .from("snapshots")
      .select("time_range, created_at")
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00Z`)
      .lte("created_at", `${today}T23:59:59Z`);

    console.log(`[Snapshot] Today is ${today}, found ${todaySnapshots?.length || 0} existing snapshots`);

    // If all time ranges already collected today, skip entirely
    if (todaySnapshots && todaySnapshots.length === TIME_RANGES.length) {
      console.log(`[Snapshot] All ${TIME_RANGES.length} time ranges already collected today - skipping`);
      return NextResponse.json(
        {
          success: true,
          skipped: true,
          message: "All snapshots already collected today",
          date: today,
          timeRanges: todaySnapshots.map(s => s.time_range),
          timestamps: todaySnapshots.map(s => s.created_at)
        },
        { status: 200 }
      );
    }

    // Determine which time ranges still need collection
    const existingTimeRanges = new Set(todaySnapshots?.map(s => s.time_range) || []);
    const timeRangesToProcess = TIME_RANGES.filter(tr => !existingTimeRanges.has(tr));

    console.log(`[Snapshot] Need to process: ${timeRangesToProcess.join(", ")}`);
    console.log(`[Snapshot] Already have: ${Array.from(existingTimeRanges).join(", ") || "none"}`);

    // Fetch current top items from Spotify for NEEDED time ranges only
    const fetchStartTime = Date.now();
    const spotifyData = await Promise.all(
      timeRangesToProcess.map(async (timeRange) => {
        const [artists, tracks] = await Promise.all([
          getTopArtists(timeRange, 50),
          getTopTracks(timeRange, 50),
        ]);
        const albums = extractAlbumsFromTracks(tracks);
        return { timeRange, artists, tracks, albums };
      })
    );
    console.log(`[Snapshot] Fetched Spotify data for ${timeRangesToProcess.length} time ranges in ${Date.now() - fetchStartTime}ms`);

    // Process all time ranges sequentially with delays
    let successCount = 0;
    const results: Array<{ timeRange: TimeRange; success: boolean; error?: string }> = [];

    for (const { timeRange, artists, tracks, albums } of spotifyData) {
      const result = await createSnapshotWithRollback(
        supabase, user.id, timeRange, artists, tracks, albums
      );
      
      results.push({
        timeRange,
        success: result.success,
        error: result.error,
      });

      if (result.success) {
        successCount++;
      } else {
        console.error(`Failed to create ${timeRange} snapshot:`, result.error);
        // Continue with other time ranges
      }
      
      // Delay between time ranges (skip after last)
      if (timeRange !== TIME_RANGES[TIME_RANGES.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, TIME_RANGE_DELAY_MS));
      }
    }

    // Update artist listening stats if any snapshot succeeded
    if (successCount > 0) {
      const { error: statsError } = await supabase.rpc("update_artist_listening_stats");

      if (statsError) {
        console.error("Failed to update artist stats:", statsError);
      }
    }

    return NextResponse.json(
      { 
        success: successCount > 0,
        message: successCount === timeRangesToProcess.length
          ? `Collected ${successCount} new snapshot(s) successfully`
          : `Collected ${successCount}/${timeRangesToProcess.length} snapshots (${existingTimeRanges.size} already existed)`,
        date: today,
        newSnapshots: timeRangesToProcess.length,
        existingSnapshots: existingTimeRanges.size,
        totalTimeRanges: TIME_RANGES.length,
        processed: timeRangesToProcess.length,
        succeeded: successCount,
        results
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Snapshot error:", error);
    return serverErrorResponse("Failed to collect snapshot");
  }
}
