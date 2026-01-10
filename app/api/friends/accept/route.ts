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
    const { friendshipId, friendUserId } = await request.json();
    
    // Accept by friendship ID or friend user ID
    if (!friendshipId && !friendUserId) {
      return badRequestResponse("friendshipId or friendUserId is required");
    }
    
    let query = supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("friend_id", user.id) // Only the recipient can accept
      .eq("status", "pending");
    
    if (friendshipId) {
      query = query.eq("id", friendshipId);
    } else {
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
