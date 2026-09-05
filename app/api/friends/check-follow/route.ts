import { isUuid } from "@/lib/api/validation";
import { NextResponse } from "next/server";
import { authenticateUser, badRequestResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/api/utils";

export async function GET(request: Request) {
  try {
    const authResult = await authenticateUser();
    if (!authResult) {
      return unauthorizedResponse();
    }
    
    const { user, supabase } = authResult;
    const { searchParams } = new URL(request.url);
    const friendUserId = searchParams.get("friendUserId");
    
    if (!isUuid(friendUserId)) {
      return badRequestResponse("A valid friendUserId parameter is required");
    }
    
    // Check friendship status from our internal friendships table
    const { data: friendship, error } = await supabase
      .from("friendships")
      .select("id, status, user_id, friend_id")
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${user.id})`)
      .maybeSingle();
    
    if (error) {
      console.error("[check-follow] Error checking friendship:", error);
      return serverErrorResponse("Failed to check friendship status");
    }
    
    if (!friendship) {
      return NextResponse.json({
        status: "none",
        isFriend: false,
        isPending: false,
        isIncoming: false,
      });
    }
    
    const isIncoming = friendship.friend_id === user.id && friendship.status === "pending";
    const isOutgoing = friendship.user_id === user.id && friendship.status === "pending";
    
    return NextResponse.json({
      status: friendship.status,
      isFriend: friendship.status === "accepted",
      isPending: friendship.status === "pending",
      isIncoming,
      isOutgoing,
      friendshipId: friendship.id,
    });
  } catch (error) {
    console.error("Error checking friendship status:", error);
    return serverErrorResponse("Failed to check friendship status");
  }
}
