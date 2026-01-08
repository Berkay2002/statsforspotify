import { NextResponse } from "next/server";
import { getAuthenticatedUser, badRequestResponse, serverErrorResponse } from "@/lib/api/utils";

export async function GET(request: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { user, supabase } = authResult;
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
    const spotifyIds = profiles.map(p => p.spotify_user_id);
    
    const { data: followCache } = await supabase
      .from("follow_cache")
      .select("spotify_friend_id, is_mutual, cached_at")
      .eq("user_id", user.id)
      .in("spotify_friend_id", spotifyIds)
      .gte("cached_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()); // 1 hour
    
    const followMap = new Map(
      followCache?.map(fc => [fc.spotify_friend_id, fc.is_mutual]) || []
    );
    
    const results = profiles.map(profile => ({
      userId: profile.user_id,
      spotifyUserId: profile.spotify_user_id,
      displayName: profile.display_name,
      discriminator: profile.discriminator,
      username: `${profile.display_name}#${profile.discriminator}`,
      avatarUrl: profile.avatar_url,
      statsVisibility: profile.stats_visibility,
      isMutualFollow: followMap.get(profile.spotify_user_id) || false,
      canViewStats: 
        profile.stats_visibility === "public" ||
        (profile.stats_visibility === "followers" && followMap.get(profile.spotify_user_id)),
    }));
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error searching friends:", error);
    return serverErrorResponse("Failed to search users");
  }
}
