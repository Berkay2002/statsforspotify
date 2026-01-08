import { NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse, serverErrorResponse } from "@/lib/api/utils";

export async function POST() {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return unauthorizedResponse();
    }

    const { user, supabase } = authResult;

    // Use the database function to delete all user data
    const { error } = await supabase.rpc("delete_user_data", {
      target_user_id: user.id,
    });

    if (error) {
      console.error("Delete user data error:", error);
      return serverErrorResponse("Failed to delete data");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return serverErrorResponse("Failed to delete data");
  }
}
