import { NextResponse } from "next/server";
import { getAuthenticatedUser, badRequestResponse, serverErrorResponse } from "@/lib/api/utils";

/**
 * POST /api/friends/reject - Reject (delete) a pending friend request
 */
export async function POST(request: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { user, supabase } = authResult;
    const { friendshipId, friendUserId } = await request.json();
    
    // Reject by friendship ID or friend user ID
    if (!friendshipId && !friendUserId) {
      return badRequestResponse("friendshipId or friendUserId is required");
    }
    
    let query = supabase
      .from("friendships")
      .delete()
      .eq("friend_id", user.id) // Only the recipient can reject incoming requests
      .eq("status", "pending");
    
    if (friendshipId) {
      query = query.eq("id", friendshipId);
    } else {
      query = query.eq("user_id", friendUserId);
    }
    
    const { error: deleteError } = await query;
    
    if (deleteError) {
      console.error("[reject] Error rejecting friend request:", deleteError);
      return serverErrorResponse("Failed to reject friend request");
    }
    
    return NextResponse.json({ 
      success: true,
      message: "Friend request rejected" 
    });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return serverErrorResponse("Failed to reject friend request");
  }
}
