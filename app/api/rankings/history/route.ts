import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RankingHistoryResponse {
  history: {
    date: string;
    rank: number;
    isNewEntry: boolean;
    isReentry: boolean;
    timeRange: string;
  }[];
  metadata: {
    peakRank: number;
    peakDate: string;
    totalSnapshots: number;
    firstSeen: string;
    lastSeen: string;
    currentRank: number | null;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Validate auth
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    const timeRange = searchParams.get("time_range");

    // Validate required params
    if (!type || !id) {
      return NextResponse.json(
        { error: "Missing required parameters: type and id" },
        { status: 400 }
      );
    }

    // Validate type
    if (!["artist", "track", "album"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be: artist, track, or album" },
        { status: 400 }
      );
    }

    // Validate time_range if provided
    if (
      timeRange &&
      !["short_term", "medium_term", "long_term"].includes(timeRange)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid time_range. Must be: short_term, medium_term, or long_term",
        },
        { status: 400 }
      );
    }

    // Call the database function
    const { data, error } = await supabase.rpc("get_ranking_history", {
      p_user_id: user.id,
      p_item_id: id,
      p_item_type: type,
      p_time_range: timeRange || null,
    });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch ranking history" },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "No ranking history found" },
        { status: 404 }
      );
    }

    // Transform snake_case to camelCase
    const history = data.map((row: {
      date: string;
      rank: number;
      is_new_entry: boolean;
      is_reentry: boolean;
      time_range: string;
      peak_rank: number;
    }) => ({
      date: row.date,
      rank: row.rank,
      isNewEntry: row.is_new_entry,
      isReentry: row.is_reentry,
      timeRange: row.time_range,
    }));

    // Compute metadata
    const peakRank = data[0].peak_rank;
    const peakEntry = data.find((row: { rank: number; date: string }) => row.rank === peakRank);
    const firstEntry = data[0];
    const lastEntry = data[data.length - 1];

    const response: RankingHistoryResponse = {
      history,
      metadata: {
        peakRank,
        peakDate: peakEntry?.date || firstEntry.date,
        totalSnapshots: data.length,
        firstSeen: firstEntry.date,
        lastSeen: lastEntry.date,
        currentRank: lastEntry.rank,
      },
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
