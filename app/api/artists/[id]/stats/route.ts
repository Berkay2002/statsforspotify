import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get artist listening stats from database
    const { data: stats, error: statsError } = await supabase
      .from("artist_listening_stats")
      .select("total_hours_listened, unique_tracks_count, total_play_count")
      .eq("user_id", user.id)
      .eq("artist_id", id)
      .single();

    if (statsError || !stats) {
      // If no stats found, return zeros
      return NextResponse.json({
        totalHoursListened: 0,
        uniqueTracksCount: 0,
        totalPlayCount: 0,
      });
    }

    return NextResponse.json({
      totalHoursListened: parseFloat(stats.total_hours_listened) || 0,
      uniqueTracksCount: stats.unique_tracks_count || 0,
      totalPlayCount: stats.total_play_count || 0,
    });
  } catch (error) {
    console.error("Error fetching artist stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch artist stats" },
      { status: 500 }
    );
  }
}
