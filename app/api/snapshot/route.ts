import { getTopArtists, getTopTracks } from "@/lib/spotify/api";
import { NextResponse } from "next/server";
import { authenticateUser, unauthorizedResponse, handleAPIError } from "@/lib/api/utils";
import { collectTimeRanges, parseSnapshotResult, prepareSnapshot, TIME_RANGES, utcDayBounds } from "@/supabase/functions/_shared/snapshots";
import type { Database, Json } from "@/lib/supabase/database";
import type { SupabaseClient } from "@supabase/supabase-js";

// Pending migration contract. The generated Database file remains a production
// schema snapshot until the migration is deployed and schema sync runs.
type SnapshotDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Database["public"]["Functions"] & {
      persist_snapshot: {
        Args: { p_user_id: string; p_time_range: string; p_artists: Json; p_tracks: Json; p_albums: Json };
        Returns: Json;
      };
    };
  };
};

export async function POST() {
  try {
    const auth = await authenticateUser();
    if (!auth) return unauthorizedResponse();
    const { user } = auth;
    const supabase = auth.supabase as SupabaseClient<SnapshotDatabase>;
    const { date, start, end } = utcDayBounds();
    const { data: existing, error } = await supabase.from("snapshots")
      .select("time_range, created_at").eq("user_id", user.id)
      .gte("created_at", start).lt("created_at", end);
    if (error) throw new Error("Unable to check existing snapshots");
    const existingRanges = new Set(existing?.map(snapshot => snapshot.time_range));
    const needed = TIME_RANGES.filter(range => !existingRanges.has(range));
    if (!needed.length) {
      const { error: aggregateError } = await supabase.rpc("update_artist_listening_stats");
      if (aggregateError) throw new Error("Unable to refresh artist statistics");
      return NextResponse.json({ success: true, skipped: true, message: "All snapshots already collected today",
        date, timeRanges: existing?.map(snapshot => snapshot.time_range), timestamps: existing?.map(snapshot => snapshot.created_at) });
    }

    // A failure in one range must not prevent the remaining ranges from being
    // collected. The RPC serializes concurrent dashboard and scheduled writes.
    const results = await collectTimeRanges(needed, async timeRange => {
      const [artists, tracks] = await Promise.all([getTopArtists(timeRange, 50), getTopTracks(timeRange, 50)]);
      const { data, error } = await supabase.rpc("persist_snapshot", {
        p_user_id: user.id, p_time_range: timeRange, ...prepareSnapshot(artists, tracks),
      });
      if (error) throw new Error("Failed to persist snapshot");
      return parseSnapshotResult(data);
    });
    const succeeded = results.filter(result => result.success).length;
    const created = results.filter(result => result.success && !result.skipped).length;
    return NextResponse.json({
      success: succeeded > 0, skipped: succeeded === needed.length && created === 0,
      message: `Collected ${created} new snapshot(s); ${needed.length - succeeded} failed`,
      date, newSnapshots: created, existingSnapshots: existingRanges.size,
      totalTimeRanges: TIME_RANGES.length, processed: needed.length, succeeded, results,
    }, { status: succeeded ? 200 : 502 });
  } catch (error) {
    return handleAPIError(error);
  }
}
