import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SpotifyAPIError } from "./errors";
import { refreshSpotifyToken } from "./token-refresh";
import { createSpotifyTokenCache } from "./token-cache";
import { getConnectionToken } from "./connection-token";

const cachedToken = createSpotifyTokenCache();

// Request scoped: never share a user's token through the Next.js data cache.
export const getSpotifyToken = cache(async (forceRefresh = false) => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new SpotifyAPIError("Please sign in.", 401, true);

  const admin = createAdminClient();
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new SpotifyAPIError("Spotify server credentials are not configured", 503);

  const token = await getConnectionToken(user.id, {
    async read() {
      const { data: connection, error: connectionError } = await admin
        .from("spotify_connections").select("refresh_token,status").eq("user_id", user.id).maybeSingle();
      if (connectionError) throw new SpotifyAPIError("Unable to read Spotify connection", 503);
      return connection ? { refreshToken: connection.refresh_token, status: connection.status } : null;
    },
    async save(previous, next) {
      const { data, error: saveError } = await admin.from("spotify_connections")
        .update({ refresh_token: next, status: "connected", last_error: null })
        .eq("user_id", user.id).eq("refresh_token", previous).select("user_id");
      if (saveError) throw new SpotifyAPIError("Unable to save refreshed Spotify connection", 503);
      return data?.length === 1;
    },
    refresh: refreshToken => refreshSpotifyToken(refreshToken, clientId, clientSecret),
    cached: cachedToken,
  }, forceRefresh);
  return { accessToken: token.accessToken, expiresIn: token.expiresIn };
});

export async function getAccessToken(forceRefresh = false) {
  return (await getSpotifyToken(forceRefresh)).accessToken;
}
