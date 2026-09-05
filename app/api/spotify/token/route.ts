import { NextResponse } from "next/server";
import { getSpotifyToken } from "@/lib/spotify/tokens";
import { SpotifyAPIError } from "@/lib/spotify/errors";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  try {
    return NextResponse.json(await getSpotifyToken(new URL(request.url).searchParams.get("refresh") === "1"), { headers });
  } catch (error) {
    const known = error instanceof SpotifyAPIError;
    return NextResponse.json({
      error: known ? error.message : "Unable to get Spotify access",
      spotifyError: true,
      requiresReauth: known && error.shouldRefresh,
    }, { status: known ? error.status : 500, headers });
  }
}
