import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }
    
    // Search profiles by display name (fuzzy match)
    const { data: profiles, error } = await supabase
      .from("user_profiles")
      .select("user_id, spotify_user_id, display_name, discriminator, avatar_url, stats_visibility")
      .ilike("display_name", `%${query}%`)
      .neq("user_id", user.id) // Exclude current user
      .limit(20);
    
    if (error) {
      throw error;
    }
    
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ results: [] });
    }
    
    // Get follow status for each profile
    const spotifyUserIds = profiles.map(profile => profile.spotify_user_id);
    
    const { data: followCache } = await supabase
      .from("follow_cache")
      .select("spotify_friend_id, is_mutual, cached_at")
      .eq("user_id", user.id)
      .in("spotify_friend_id", spotifyUserIds)
      .gte("cached_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()); // 1 hour
    
    const mutualFollowStatusMap = new Map(
      followCache?.map(cacheEntry => [cacheEntry.spotify_friend_id, cacheEntry.is_mutual]) || []
    );
    
    const results = profiles.map(profile => ({
      userId: profile.user_id,
      spotifyUserId: profile.spotify_user_id,
      displayName: profile.display_name,
      discriminator: profile.discriminator,
      username: `${profile.display_name}#${profile.discriminator}`,
      avatarUrl: profile.avatar_url,
      statsVisibility: profile.stats_visibility,
      isMutualFollow: mutualFollowStatusMap.get(profile.spotify_user_id) || false,
      canViewStats: 
        profile.stats_visibility === "public" ||
        (profile.stats_visibility === "followers" && mutualFollowStatusMap.get(profile.spotify_user_id)),
    }));
    
    return NextResponse.json({ results });
    
  } catch (error) {
    console.error("Error searching friends:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
