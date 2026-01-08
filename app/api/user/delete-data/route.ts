import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateAuth, unauthorizedResponse, serverErrorResponse } from "@/lib/api/utils";

export async function POST() {
  const user = await validateAuth();
  if (!user) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  try {
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
