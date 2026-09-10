import { NextRequest, NextResponse } from "next/server";
import { authorizeStatsOwner } from "@/lib/stats/access";
import { createStatsAccessStore, statsErrorResponse } from "@/lib/stats/server";
import { 
  authenticateUser,
  unauthorizedResponse, 
  badRequestResponse, 
  validateItemType
} from "@/lib/api/utils";

interface SparklineResponse {
  sparklines: Record<string, { date: string; rank: number }[]>;
}

export async function GET(request: NextRequest) {
  try {
    // Validate auth
    const auth = await authenticateUser();
    if (!auth) {
      return unauthorizedResponse();
    }

    const { user, supabase } = auth;
    const owner = await authorizeStatsOwner(user.id, request.nextUrl.searchParams.get("user_id"), createStatsAccessStore(supabase));

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
      p_user_id: owner.userId,
      p_item_ids: ids,
      p_item_type: type,
      p_days: days,
    });

    if (error) {
      throw error;
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

    // Ensure stable chronological ordering per item (defensive against any upstream ordering changes)
    for (const sparklinePoints of Object.values(sparklines)) {
      sparklinePoints.sort((firstPoint, secondPoint) => {
        return new Date(firstPoint.date).getTime() - new Date(secondPoint.date).getTime();
      });
    }

    const response: SparklineResponse = {
      sparklines,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return statsErrorResponse(error);
  }
}
