import { createClient } from "npm:@supabase/supabase-js@2.90.0";
import { collectSnapshots, type CollectorStore } from "../_shared/collector.ts";
import { utcDayBounds } from "../_shared/snapshots.ts";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const expectedToken = Deno.env.get("FUNCTION_COLLECT_SNAPSHOTS_SECRET") ?? serviceKey;
  if (!expectedToken || request.headers.get("Authorization") !== `Bearer ${expectedToken}`) {
    return json({ error: "Unauthorized" }, 401);
  }
  try {
    const url = Deno.env.get("SUPABASE_URL");
    if (!url || !serviceKey) throw new Error("Supabase server credentials are not configured");
    const supabase = createClient(url, serviceKey);
    const store: CollectorStore = {
      async listConnections(afterUserId) {
        let query = supabase.from("spotify_connections").select("user_id,refresh_token,status")
          .eq("status", "connected").order("user_id", { ascending: true }).limit(500);
        if (afterUserId) query = query.gt("user_id", afterUserId);
        const { data, error } = await query;
        if (error) throw new Error("Failed to load Spotify connections");
        return data ?? [];
      },
      async hasSnapshot(userId, timeRange) {
        const { start, end } = utcDayBounds();
        const { data, error } = await supabase.from("snapshots").select("id")
          .eq("user_id", userId).eq("time_range", timeRange)
          .gte("created_at", start).lt("created_at", end).maybeSingle();
        if (error) throw new Error("Failed to check existing snapshot");
        return data !== null;
      },
      async persistSnapshot(userId, timeRange, payload) {
        const { data, error } = await supabase.rpc("persist_snapshot", {
          p_user_id: userId, p_time_range: timeRange, ...payload,
        });
        if (error) throw new Error("Failed to persist snapshot");
        return data;
      },
      async refreshStats(userId) {
        const { error } = await supabase.rpc("refresh_artist_listening_stats_for_user", { p_user_id: userId });
        if (error) throw new Error("Failed to refresh artist statistics");
      },
      async updateConnection(expected, values) {
        const { data, error } = await supabase.from("spotify_connections").update(values)
          .eq("user_id", expected.user_id).eq("refresh_token", expected.refresh_token)
          .eq("status", "connected").select("user_id");
        if (error) throw new Error("Failed to update Spotify connection");
        return data?.length === 1;
      },
    };
    const result = await collectSnapshots({
      store, fetch, clientId: Deno.env.get("SPOTIFY_CLIENT_ID") ?? "",
      clientSecret: Deno.env.get("SPOTIFY_CLIENT_SECRET") ?? "",
    });
    // The scheduler can rerun after this cooldown; committed ranges are skipped.
    return json(result, result.retryAfter ? 429 : result.failed ? 502 : 200,
      result.retryAfter ? { "Retry-After": String(result.retryAfter) } : {});
  } catch (error) {
    console.error("Snapshot collector failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Snapshot collection failed" }, 500);
  }
});
