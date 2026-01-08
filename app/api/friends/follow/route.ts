import { NextResponse } from "next/server";
import { getAuthenticatedUser, badRequestResponse, serverErrorResponse } from "@/lib/api/utils";
import { followUser } from "@/lib/spotify/api";

export async function POST(request: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { user, supabase } = authResult;
    const { spotifyUserId } = await request.json();
    
    if (!spotifyUserId) {
      return badRequestResponse("spotifyUserId is required");
    }
    
    console.log("[follow] Attempting to follow Spotify user:", spotifyUserId, "(length:", spotifyUserId.length, ")");
    
    // Follow on Spotify (works with both username-style and long-form IDs)
    await followUser(spotifyUserId);
    
    console.log("[follow] Successfully followed user:", spotifyUserId);
    
    // Invalidate cache for this user
    await supabase
      .from("follow_cache")
      .delete()
      .eq("user_id", user.id)
      .eq("spotify_friend_id", spotifyUserId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error following user:", error);
    return serverErrorResponse("Failed to follow user");
  }
}
