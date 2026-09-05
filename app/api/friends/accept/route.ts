import { isUuid, readJsonObject } from "@/lib/api/validation";
import { NextResponse } from "next/server";
import { authenticateUser, badRequestResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/api/utils";

/**
 * POST /api/friends/accept - Accept a pending friend request
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
    
    // Accept by friendship ID or friend user ID
    if ((friendshipId !== undefined && !isUuid(friendshipId)) ||
        (friendUserId !== undefined && !isUuid(friendUserId)) ||
        (!friendshipId && !friendUserId)) {
      return badRequestResponse("A valid friendshipId or friendUserId is required");
    }
    
    let query = supabase
      .from("friendships")
      .update({ status: "accepted" }, { count: "exact" })
      .eq("friend_id", user.id) // Only the recipient can accept
      .eq("status", "pending");
    
    if (friendshipId) {
      query = query.eq("id", friendshipId);
    } else if (friendUserId) {
      query = query.eq("user_id", friendUserId);
    }
    
    const { error: updateError, count } = await query;
    
    if (updateError) {
      console.error("[accept] Error accepting friend request:", updateError);
      return serverErrorResponse("Failed to accept friend request");
    }
    
    if (count === 0) {
      return NextResponse.json(
        { error: "No pending friend request found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: "Friend request accepted" 
    });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return serverErrorResponse("Failed to accept friend request");
  }
}
