import { isUuid } from "@/lib/api/validation";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { 
  validateAuth, 
  unauthorizedResponse, 
  badRequestResponse, 
  serverErrorResponse,
  validateItemType,
  validateTimeRange
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
    const timeRange = searchParams.get("time_range") ?? "medium_term";
    const targetUserId = searchParams.get("user_id") ?? user.id;
    if (!validateTimeRange(timeRange)) return badRequestResponse("Invalid time_range");
    if (!isUuid(targetUserId)) return badRequestResponse("Invalid user_id");

    // Validate required params
    if (!type || !idsParam) {
      return badRequestResponse("Missing required parameters: type and ids");
    }

    // Validate type
    if (!validateItemType(type)) {
      return badRequestResponse("Invalid type. Must be: artist, track, or album");
    }

    // Parse and validate IDs
    const ids = [...new Set(idsParam.split(",").filter(Boolean))];
    if (ids.some((id) => !/^[a-zA-Z0-9]{22}$/.test(id))) {
      return badRequestResponse("Invalid Spotify item ID");
    }
    if (ids.length === 0) {
      return badRequestResponse("No valid IDs provided");
    }

    if (ids.length > 50) {
      return badRequestResponse("Maximum 50 IDs allowed per request");
    }

    // Parse days parameter
    const days = daysParam === null ? 14 : Number(daysParam);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      return badRequestResponse("Invalid days parameter. Must be between 1 and 365");
    }

    // RLS enforces ownership, accepted friendship, and profile visibility.
    const sparklines: SparklineResponse["sparklines"] = {};
    const since = new Date(Date.now() - days * 86400000).toISOString();
    // PostgREST caps each response; page through larger windows instead of truncating history.
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const query = type === "artist"
        ? supabase.from("artist_rankings").select("item_id:artist_id,rank,snapshots!inner(created_at,time_range)").in("artist_id", ids)
        : type === "track"
          ? supabase.from("track_rankings").select("item_id:track_id,rank,snapshots!inner(created_at,time_range)").in("track_id", ids)
          : supabase.from("album_rankings").select("item_id:album_id,rank,snapshots!inner(created_at,time_range)").in("album_id", ids);
      const { data, error } = await query
        .eq("user_id", targetUserId)
        .eq("snapshots.time_range", timeRange)
        .gte("snapshots.created_at", since)
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error("Database error:", error);
        return serverErrorResponse("Failed to fetch sparkline data");
      }
      for (const row of data ?? []) {
        (sparklines[row.item_id] ??= []).push({ date: row.snapshots.created_at, rank: row.rank });
      }
      if (!data || data.length < pageSize) break;
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
        // Listening data must not survive account changes in the browser cache.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return serverErrorResponse();
  }
}
