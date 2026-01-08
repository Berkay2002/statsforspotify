import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { 
  validateAuth, 
  unauthorizedResponse, 
  badRequestResponse, 
  serverErrorResponse,
  validateItemType
} from "@/lib/api/utils";

interface SparklineResponse {
  sparklines: Record<string, { date: string; rank: number }[]>;
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
    const idsParam = searchParams.get("ids");
    const daysParam = searchParams.get("days");

    // Validate required params
    if (!type || !idsParam) {
      return badRequestResponse("Missing required parameters: type and ids");
    }

    // Validate type
    if (!validateItemType(type)) {
      return badRequestResponse("Invalid type. Must be: artist, track, or album");
    }

    // Parse and validate IDs
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length === 0) {
      return badRequestResponse("No valid IDs provided");
    }

    if (ids.length > 50) {
      return badRequestResponse("Maximum 50 IDs allowed per request");
    }

    // Parse days parameter
    const days = daysParam ? parseInt(daysParam, 10) : 14;
    if (isNaN(days) || days < 1 || days > 365) {
      return badRequestResponse("Invalid days parameter. Must be between 1 and 365");
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
      return serverErrorResponse("Failed to fetch sparkline data");
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
        // Increase cache time since sparkline data doesn't change frequently
        // Allow browser to cache for 5 minutes, CDN can cache for 2 minutes
        "Cache-Control": "private, max-age=300, s-maxage=120, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return serverErrorResponse();
  }
}
