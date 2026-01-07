import { NextRequest, NextResponse } from "next/server";
import { getArtistTopTracks } from "@/lib/spotify/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tracks = await getArtistTopTracks(id, "medium_term", 10);

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
    return NextResponse.json(
      { error: "Failed to fetch artist tracks" },
      { status: 500 }
    );
  }
}
