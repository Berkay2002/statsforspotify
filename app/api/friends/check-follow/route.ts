import { NextResponse } from "next/server";
import { getAuthenticatedUser, badRequestResponse, serverErrorResponse } from "@/lib/api/utils";
import { checkMutualFollows } from "@/lib/spotify/api";

export async function GET(request: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const spotifyUserId = searchParams.get("spotifyUserId");
    
    if (!spotifyUserId) {
      return badRequestResponse("spotifyUserId parameter is required");
    }
    
    console.log("[check-follow] Checking follow status for Spotify user ID:", spotifyUserId);
    
    // Check follow status
    const results = await checkMutualFollows([spotifyUserId]);
    
    if (results.length === 0) {
      return NextResponse.json({
        isFollowing: false,
        isMutual: false,
      });
    }
    
    return NextResponse.json({
      isFollowing: results[0].isFollowing,
      isMutual: results[0].isMutual,
    });
  } catch (error) {
    console.error("Error checking follow status:", error);
    return serverErrorResponse("Failed to check follow status");
  }
}
