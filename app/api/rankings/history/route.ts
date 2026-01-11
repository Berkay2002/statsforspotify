import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { 
  validateAuth, 
  unauthorizedResponse, 
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
  validateItemType,
  validateTimeRange
} from "@/lib/api/utils";

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
    const user = await validateAuth();
    if (!user) {
      return unauthorizedResponse();
    }

    const supabase = await createClient();

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    const timeRange = searchParams.get("time_range");

    // Validate required params
    if (!type || !id) {
      return badRequestResponse("Missing required parameters: type and id");
    }

    // Validate type
    if (!validateItemType(type)) {
      return badRequestResponse("Invalid type. Must be: artist, track, or album");
    }

    // Validate time_range if provided
    if (timeRange && !validateTimeRange(timeRange)) {
      return badRequestResponse("Invalid time_range. Must be: short_term, medium_term, or long_term");
    }

    const effectiveTimeRange = validateTimeRange(timeRange) ? timeRange : "medium_term";

    // Call the database function
    const { data, error } = await supabase.rpc("get_ranking_history", {
      p_user_id: user.id,
      p_item_id: id,
      p_item_type: type,
      p_time_range: effectiveTimeRange,
    });

    if (error) {
      console.error("Database error:", error);
      return serverErrorResponse("Failed to fetch ranking history");
    }

    if (!data || data.length === 0) {
      return notFoundResponse("No ranking history found");
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
        // History data is relatively stable, increase cache time
        "Cache-Control": "private, max-age=600, s-maxage=300, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return serverErrorResponse();
  }
}
