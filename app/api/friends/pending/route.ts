import { NextResponse } from "next/server";
import { authenticateUser, serverErrorResponse, unauthorizedResponse } from "@/lib/api/utils";

/**
 * GET /api/friends/pending - List incoming pending friend requests
 */
export async function GET() {
  try {
    const authResult = await authenticateUser();
    if (!authResult) {
      return unauthorizedResponse();
    }
    
    const { user, supabase } = authResult;
    
    // Get pending requests where current user is the target (friend_id)
    const { data: pendingRequests, error } = await supabase
      .from("friendships")
      .select("id, user_id, created_at")
      .eq("friend_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("[pending] Error fetching pending requests:", error);
      return serverErrorResponse("Failed to fetch pending requests");
    }
    
    if (!pendingRequests || pendingRequests.length === 0) {
      return NextResponse.json({ requests: [] });
    }
    
    // Fetch profiles for the requesting users
    const userIds = pendingRequests.map(request => request.user_id);
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, discriminator, avatar_url")
      .in("user_id", userIds);
    
    const profileMap = new Map(
      (profiles || []).map(profile => [profile.user_id, profile])
    );
    
    const requests = pendingRequests.map(request => {
      const profile = profileMap.get(request.user_id);
      
      return {
        friendshipId: request.id,
        userId: request.user_id,
        displayName: profile?.display_name || "Unknown",
        discriminator: profile?.discriminator || "0000",
        username: `${profile?.display_name || "Unknown"}#${profile?.discriminator || "0000"}`,
        avatarUrl: profile?.avatar_url || null,
        createdAt: request.created_at,
      };
    });
    
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    return serverErrorResponse("Failed to fetch pending requests");
  }
}
