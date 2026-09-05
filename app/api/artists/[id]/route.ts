import { NextRequest, NextResponse } from "next/server";
import { getArtistDetails } from "@/lib/spotify/api";
import { handleAPIError } from "@/lib/api/utils";
import { normalizePopularity } from "@/lib/spotify/normalizers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const artist = await getArtistDetails(id);

    return NextResponse.json({
      id: artist.id,
      name: artist.name,
      imageUrl: artist.images?.[0]?.url ?? null,
      genres: artist.genres ?? [],
      followers: artist.followers?.total ?? 0,
      popularity: normalizePopularity(artist.popularity),
    });
  } catch (error) {
    console.error("Error fetching artist details:", error);
    return handleAPIError(error);
  }
}
