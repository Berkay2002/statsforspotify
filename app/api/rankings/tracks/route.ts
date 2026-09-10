import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, badRequestResponse, unauthorizedResponse, validateTimeRange } from "@/lib/api/utils";
import { authorizeStatsOwner } from "@/lib/stats/access";
import { createStatsAccessStore, statsErrorResponse } from "@/lib/stats/server";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateUser();
    if (!auth) return unauthorizedResponse();
    const params = request.nextUrl.searchParams;
    const timeRange = params.get("time_range") ?? "medium_term";
    if (!validateTimeRange(timeRange)) return badRequestResponse("Invalid time_range");
    const { user, supabase } = auth;
    const owner = await authorizeStatsOwner(user.id, params.get("user_id"), createStatsAccessStore(supabase));
    const { data: snapshot, error: snapshotError } = await supabase.from("snapshots")
      .select("id").eq("user_id", owner.userId).eq("time_range", timeRange)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (snapshotError) throw snapshotError;
    if (!snapshot) return NextResponse.json([], { headers: { "Cache-Control": "private, no-store" } });
    const { data, error } = await supabase.from("track_rankings")
      .select("rank, track_id, track_name, track_image_url, artist_id, artist_name, album_id, album_name, duration_ms, popularity")
      .eq("snapshot_id", snapshot.id).eq("user_id", owner.userId).order("rank", { ascending: true });
    if (error) throw error;
    return NextResponse.json((data ?? []).map((track) => ({
      rank: track.rank,
      id: track.track_id,
      name: track.track_name,
      imageUrl: track.track_image_url,
      artistId: track.artist_id,
      artistName: track.artist_name,
      albumId: track.album_id,
      albumName: track.album_name,
      durationMs: track.duration_ms ?? 0,
      popularity: track.popularity ?? 0,
    })), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return statsErrorResponse(error);
  }
}
