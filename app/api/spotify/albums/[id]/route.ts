import { NextRequest, NextResponse } from "next/server";
import { getAlbumDetails } from "@/lib/spotify/api";
import { serverErrorResponse } from "@/lib/api/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: albumId } = await params;

  try {
    const album = await getAlbumDetails(albumId);
    return NextResponse.json(album);
  } catch (error) {
    console.error(`Error fetching album ${albumId}:`, error);
    return serverErrorResponse("Failed to fetch album details");
  }
}
