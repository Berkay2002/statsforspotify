import { isUuid, readJsonObject } from "@/lib/api/validation";
import { NextResponse } from "next/server";
import { authenticateUser, badRequestResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/api/utils";

/**
 * POST /api/friends/follow - Send a friend request
 * Creates a pending friendship entry in the database
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
    const { friendUserId } = body;
    
    if (!isUuid(friendUserId)) {
      return badRequestResponse("A valid friendUserId is required");
    }
    
    // Don't allow self-friending
    if (friendUserId === user.id) {
      return badRequestResponse("Cannot send friend request to yourself");
    }
    
    // Check if a friendship already exists (in either direction)
    const { data: existingFriendship, error: lookupError } = await supabase
      .from("friendships")
      .select("id, status, user_id, friend_id")
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${user.id})`)
      .maybeSingle();
    
    if (lookupError) {
      console.error("[follow] Error checking friendship:", lookupError);
      return serverErrorResponse("Failed to check existing friendship");
    }

    if (existingFriendship) {
      // If there's a pending request FROM the friend, accept it instead
      if (existingFriendship.friend_id === user.id && existingFriendship.status === "pending") {
        const { error: updateError } = await supabase
          .from("friendships")
          .update({ status: "accepted" })
          .eq("id", existingFriendship.id);
        
        if (updateError) {
          console.error("[follow] Error accepting existing request:", updateError);
          return serverErrorResponse("Failed to accept friend request");
        }
        
        return NextResponse.json({ 
          success: true, 
          status: "accepted",
          message: "Friend request accepted" 
        });
      }
      
      // Already friends or already sent a request
      return NextResponse.json({ 
        success: true, 
        status: existingFriendship.status,
        message: existingFriendship.status === "accepted" 
          ? "Already friends" 
          : "Friend request already sent"
      });
    }
    
    // Create new pending friendship request
    const { error: insertError } = await supabase
      .from("friendships")
      .insert({
        user_id: user.id,
        friend_id: friendUserId,
        status: "pending",
      });
    
    if (insertError) {
      console.error("[follow] Error creating friend request:", insertError);
      return serverErrorResponse("Failed to send friend request");
    }
    
    return NextResponse.json({ 
      success: true, 
      status: "pending",
      message: "Friend request sent" 
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    return serverErrorResponse("Failed to send friend request");
  }
}
