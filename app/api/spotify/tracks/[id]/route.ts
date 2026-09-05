import { NextRequest, NextResponse } from "next/server";
import { getTrackDetails } from "@/lib/spotify/api";
import { handleAPIError } from "@/lib/api/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: trackId } = await params;

  try {
    const track = await getTrackDetails(trackId);
    return NextResponse.json(track);
  } catch (error) {
    console.error(`Error fetching track ${trackId}:`, error);
    return handleAPIError(error);
  }
}
