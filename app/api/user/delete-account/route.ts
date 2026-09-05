import { NextResponse } from "next/server";
import { authenticateUser, unauthorizedResponse, serverErrorResponse } from "@/lib/api/utils";

export async function POST() {
  try {
    const authResult = await authenticateUser();
    if (!authResult) {
      return unauthorizedResponse();
    }

    const { user, supabase } = authResult;

    // The database deletes the account and all related records in one transaction.
    const { error: deleteError } = await supabase.rpc("delete_user_account", {
      target_user_id: user.id,
    });

    if (deleteError) {
      console.error("Delete user account error:", deleteError);
      return serverErrorResponse("Failed to delete account. Please contact support.");
    }

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    return serverErrorResponse("Failed to delete account");
  }
}
