import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SparklineResponse {
  sparklines: Record<string, { date: string; rank: number }[]>;
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
    const idsParam = searchParams.get("ids");
    const daysParam = searchParams.get("days");

    // Validate required params
    if (!type || !idsParam) {
      return NextResponse.json(
        { error: "Missing required parameters: type and ids" },
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

    // Parse and validate IDs
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No valid IDs provided" },
        { status: 400 }
      );
    }

    if (ids.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 IDs allowed per request" },
        { status: 400 }
      );
    }

    // Parse days parameter
    const days = daysParam ? parseInt(daysParam, 10) : 14;
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: "Invalid days parameter. Must be between 1 and 365" },
        { status: 400 }
      );
    }

    // Call the database function
    const { data, error } = await supabase.rpc("get_sparkline_data", {
      p_user_id: user.id,
      p_item_ids: ids,
      p_item_type: type,
      p_days: days,
    });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch sparkline data" },
        { status: 500 }
      );
    }

    // Group results by item_id
    const sparklines: Record<string, { date: string; rank: number }[]> = {};
    
    if (data) {
      for (const row of data) {
        if (!sparklines[row.item_id]) {
          sparklines[row.item_id] = [];
        }
        sparklines[row.item_id].push({
          date: row.date,
          rank: row.rank,
        });
      }
    }

    const response: SparklineResponse = {
      sparklines,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=60",
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
