import { NextResponse } from "next/server";
import { getAuthenticatedUser, badRequestResponse, serverErrorResponse } from "@/lib/api/utils";
import { unfollowUser } from "@/lib/spotify/api";

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
    
    // Unfollow on Spotify
    await unfollowUser(spotifyUserId);
    
    // Update cache to reflect unfollowed status
    await supabase
      .from("follow_cache")
      .update({
        is_mutual: false,
        cached_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("spotify_friend_id", spotifyUserId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return serverErrorResponse("Failed to unfollow user");
  }
}
