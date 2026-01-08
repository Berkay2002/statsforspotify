import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { followUser } from "@/lib/spotify/api";

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
    
    // Follow on Spotify
    await followUser(spotifyUserId);
    
    // Invalidate cache for this user
    await supabase
      .from("follow_cache")
      .delete()
      .eq("user_id", user.id)
      .eq("spotify_friend_id", spotifyUserId);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error following user:", error);
    return NextResponse.json(
      { error: "Failed to follow user" },
      { status: 500 }
    );
  }
}
