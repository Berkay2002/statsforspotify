import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { stats_visibility } = await request.json();
    
    if (!stats_visibility || !["public", "followers", "private"].includes(stats_visibility)) {
      return NextResponse.json(
        { error: "Invalid stats_visibility value" },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: "Failed to update privacy settings" },
      { status: 500 }
    );
  }
}
