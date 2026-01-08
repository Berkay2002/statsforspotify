import { NextResponse } from "next/server";
import { getAuthenticatedUser, badRequestResponse, serverErrorResponse } from "@/lib/api/utils";

/**
 * POST /api/friends/unfollow - Remove a friendship
 * Deletes the friendship entry from the database (either party can remove)
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
    
    // Delete friendship in either direction (RLS policy allows this for either party)
    const { error: deleteError } = await supabase
      .from("friendships")
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${user.id})`);
    
    if (deleteError) {
      console.error("[unfollow] Error removing friendship:", deleteError);
      return serverErrorResponse("Failed to remove friendship");
    }
    
    return NextResponse.json({ 
      success: true,
      message: "Friendship removed" 
    });
  } catch (error) {
    console.error("Error removing friendship:", error);
    return serverErrorResponse("Failed to remove friendship");
  }
}
