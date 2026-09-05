import { isUuid, readJsonObject } from "@/lib/api/validation";
import { NextResponse } from "next/server";
import { authenticateUser, badRequestResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/api/utils";

/**
 * POST /api/friends/reject - Reject (delete) a pending friend request
 */
export async function POST(request: Request) {
  try {
    const authResult = await authenticateUser();
    if (!authResult) {
      return unauthorizedResponse();
    }
    
    const { user, supabase } = authResult;
    const body = await readJsonObject(request);
    if (!body) return badRequestResponse("Request body must be a JSON object");
    const { friendshipId, friendUserId } = body;
    
    // Reject by friendship ID or friend user ID
    if ((friendshipId !== undefined && !isUuid(friendshipId)) ||
        (friendUserId !== undefined && !isUuid(friendUserId)) ||
        (!friendshipId && !friendUserId)) {
      return badRequestResponse("A valid friendshipId or friendUserId is required");
    }
    
    let query = supabase
      .from("friendships")
      .delete()
      .eq("friend_id", user.id) // Only the recipient can reject incoming requests
      .eq("status", "pending");
    
    if (friendshipId) {
      query = query.eq("id", friendshipId);
    } else if (friendUserId) {
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
