import { NextRequest, NextResponse } from "next/server";
import { getArtistTopTracks } from "@/lib/spotify/api";
import { badRequestResponse, serverErrorResponse, validateTimeRange } from "@/lib/api/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const timeRangeParameter = request.nextUrl.searchParams.get("time_range");

    if (timeRangeParameter && !validateTimeRange(timeRangeParameter)) {
      return badRequestResponse(
        "Invalid time_range. Must be: short_term, medium_term, or long_term"
      );
    }

    const timeRange = validateTimeRange(timeRangeParameter)
      ? timeRangeParameter
      : "medium_term";

    const tracks = await getArtistTopTracks(id, timeRange, 10);

    return NextResponse.json(
      tracks.map((track) => ({
        rank: track.rank,
        id: track.id,
        name: track.name,
        imageUrl: track.imageUrl,
        albumName: track.albumName,
        durationMs: track.durationMs,
        popularity: track.popularity,
      }))
    );
  } catch (error) {
    console.error("Error fetching artist tracks:", error);
    return serverErrorResponse("Failed to fetch artist tracks");
  }
}
