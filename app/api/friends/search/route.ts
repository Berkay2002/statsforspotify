import { NextResponse } from "next/server";
import { getAuthenticatedUser, serverErrorResponse } from "@/lib/api/utils";

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
      .select("user_id, display_name, discriminator, avatar_url, stats_visibility")
      .ilike("display_name", `%${query}%`)
      .neq("user_id", user.id) // Exclude current user
      .limit(20);
    
    if (error) {
      throw error;
    }
    
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ results: [] });
    }
    
    // Get friendship status for each profile
    const profileUserIds = profiles.map(profile => profile.user_id);
    
    const { data: friendships } = await supabase
      .from("friendships")
      .select("user_id, friend_id, status")
      .or(
        profileUserIds.map(profileId => 
          `and(user_id.eq.${user.id},friend_id.eq.${profileId}),and(user_id.eq.${profileId},friend_id.eq.${user.id})`
        ).join(",")
      );
    
    // Build a map of friendship status by user ID
    const friendshipStatusMap = new Map<string, { status: string; isIncoming: boolean }>();
    (friendships || []).forEach(friendship => {
      const otherUserId = friendship.user_id === user.id ? friendship.friend_id : friendship.user_id;
      const isIncoming = friendship.friend_id === user.id;
      friendshipStatusMap.set(otherUserId, { 
        status: friendship.status, 
        isIncoming: isIncoming && friendship.status === "pending"
      });
    });
    
    const results = profiles.map(profile => {
      const friendshipInfo = friendshipStatusMap.get(profile.user_id);
      const isFriend = friendshipInfo?.status === "accepted";
      
      return {
        userId: profile.user_id,
        displayName: profile.display_name,
        discriminator: profile.discriminator,
        username: `${profile.display_name}#${profile.discriminator}`,
        avatarUrl: profile.avatar_url,
        statsVisibility: profile.stats_visibility,
        friendshipStatus: friendshipInfo?.status || "none",
        isFriend,
        isPendingIncoming: friendshipInfo?.isIncoming || false,
        canViewStats: 
          profile.stats_visibility === "public" ||
          (profile.stats_visibility === "followers" && isFriend),
      };
    });
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error searching friends:", error);
    return serverErrorResponse("Failed to search users");
  }
}
