import { NextResponse } from "next/server";
import { getAuthenticatedUser, badRequestResponse, serverErrorResponse } from "@/lib/api/utils";

/**
 * POST /api/friends/follow - Send a friend request
 * Creates a pending friendship entry in the database
 */
export async function POST(request: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { user, supabase } = authResult;
    const { friendUserId } = await request.json();
    
    if (!friendUserId) {
      return badRequestResponse("friendUserId is required");
    }
    
    // Don't allow self-friending
    if (friendUserId === user.id) {
      return badRequestResponse("Cannot send friend request to yourself");
    }
    
    // Check if a friendship already exists (in either direction)
    const { data: existingFriendship } = await supabase
      .from("friendships")
      .select("id, status, user_id, friend_id")
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${user.id})`)
      .single();
    
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
