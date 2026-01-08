import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unfollowUser } from "@/lib/spotify/api";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { spotifyUserId } = await request.json();
    
    if (!spotifyUserId) {
      return NextResponse.json(
        { error: "spotifyUserId is required" },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: "Failed to unfollow user" },
      { status: 500 }
    );
  }
}
