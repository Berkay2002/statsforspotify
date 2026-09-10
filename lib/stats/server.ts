import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { StatsAccessError, type StatsAccessStore } from "./access";

export function createStatsAccessStore(supabase: SupabaseClient<Database>): StatsAccessStore {
  return {
    async getProfile(userId) {
      const { data, error } = await supabase.from("user_profiles")
        .select("user_id, display_name, discriminator, stats_visibility")
        .eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data ? {
        userId: data.user_id,
        displayName: data.display_name,
        discriminator: data.discriminator,
        statsVisibility: data.stats_visibility,
      } : null;
    },
    async getFriendships(viewerId) {
      const { data, error } = await supabase.from("friendships")
        .select("user_id, friend_id, status")
        .eq("status", "accepted")
        .or(`user_id.eq.${viewerId},friend_id.eq.${viewerId}`);
      if (error) throw error;
      return (data ?? []).map((row) => ({ userId: row.user_id, friendId: row.friend_id, status: row.status }));
    },
  };
}

export function statsErrorResponse(error: unknown): NextResponse {
  if (error instanceof StatsAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
  }
  console.error("Stats request failed:", error);
  return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
}
