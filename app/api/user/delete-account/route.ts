import { NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse, serverErrorResponse } from "@/lib/api/utils";

export async function POST() {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return unauthorizedResponse();
    }

    const { user, supabase } = authResult;

    // Delete all user data from the database using the database function
    const { error: dataError } = await supabase.rpc("delete_user_data", {
      target_user_id: user.id,
    });

    if (dataError) {
      console.error("Delete user data error:", dataError);
      return serverErrorResponse("Failed to delete user data");
    }

    // Delete the user profile record
    const { error: profileError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("user_id", user.id);

    if (profileError) {
      console.error("Delete user profile error:", profileError);
    }

    // Use the Supabase Management API to delete the user account
    // This requires calling a database function with security definer
    // that will handle the auth.users deletion
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
