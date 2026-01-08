import { NextResponse } from "next/server";
import { getAuthenticatedUser, badRequestResponse, serverErrorResponse } from "@/lib/api/utils";

export async function PATCH(request: Request) {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { user, supabase } = authResult;
    const { stats_visibility } = await request.json();
    
    if (!stats_visibility || !["public", "followers", "private"].includes(stats_visibility)) {
      return badRequestResponse("Invalid stats_visibility value");
    }
    
    // Update user profile
    const { error } = await supabase
      .from("user_profiles")
      .update({ stats_visibility, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating privacy settings:", error);
    return serverErrorResponse("Failed to update privacy settings");
  }
}
