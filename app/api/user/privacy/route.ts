import { readJsonObject } from "@/lib/api/validation";
import { NextResponse } from "next/server";
import { authenticateUser, badRequestResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/api/utils";

export async function PATCH(request: Request) {
  try {
    const authResult = await authenticateUser();
    if (!authResult) {
      return unauthorizedResponse();
    }
    
    const { user, supabase } = authResult;
    const body = await readJsonObject(request);
    if (!body) return badRequestResponse("Request body must be a JSON object");
    const { stats_visibility } = body;
    
    if (stats_visibility !== "public" && stats_visibility !== "followers" && stats_visibility !== "private") {
      return badRequestResponse("Invalid stats_visibility value");
    }
    
    // Update user profile
    const { error, count } = await supabase
      .from("user_profiles")
      .update({ stats_visibility, updated_at: new Date().toISOString() }, { count: "exact" })
      .eq("user_id", user.id);
    
    if (error) throw error;
    if (count === 0) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating privacy settings:", error);
    return serverErrorResponse("Failed to update privacy settings");
  }
}
