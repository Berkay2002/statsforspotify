import { NextResponse } from "next/server";
import { authenticateUser, serverErrorResponse, unauthorizedResponse } from "@/lib/api/utils";

/**
 * GET /api/friends/list - List accepted friends
 */
export async function GET() {
  try {
    const authResult = await authenticateUser();
    if (!authResult) {
      return unauthorizedResponse();
    }
    
    const { user, supabase } = authResult;
    
    // Get friendships where current user is either user_id or friend_id with accepted status
    const { data: friendships, error } = await supabase
      .from("friendships")
      .select("id, user_id, friend_id, created_at")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("[list] Error fetching friendships:", error);
      return serverErrorResponse("Failed to fetch friends list");
    }
    
    if (!friendships || friendships.length === 0) {
      return NextResponse.json({ friends: [] });
    }
    
    // Get the friend user IDs (the other user in the friendship)
    const friendUserIds = friendships.map(friendship => 
      friendship.user_id === user.id ? friendship.friend_id : friendship.user_id
    );
    
    // Fetch friend profiles
    const { data: profiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, discriminator, avatar_url, stats_visibility")
      .in("user_id", friendUserIds);
    
    if (profileError) {
      console.error("[list] Error fetching profiles:", profileError);
      return serverErrorResponse("Failed to fetch friend profiles");
    }
    
    const profileMap = new Map(
      (profiles || []).map(profile => [profile.user_id, profile])
    );
    
    const friends = friendships.map(friendship => {
      const friendUserId = friendship.user_id === user.id ? friendship.friend_id : friendship.user_id;
      const profile = profileMap.get(friendUserId);
      
      return {
        friendshipId: friendship.id,
        userId: friendUserId,
        displayName: profile?.display_name || "Unknown",
        discriminator: profile?.discriminator || "0000",
        username: `${profile?.display_name || "Unknown"}#${profile?.discriminator || "0000"}`,
        avatarUrl: profile?.avatar_url || null,
        statsVisibility: profile?.stats_visibility || "private",
        friendsSince: friendship.created_at,
      };
    });
    
    return NextResponse.json({ friends });
  } catch (error) {
    console.error("Error fetching friends list:", error);
    return serverErrorResponse("Failed to fetch friends list");
  }
}
