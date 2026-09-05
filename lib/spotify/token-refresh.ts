import { SpotifyAPIError } from "./errors";

export type SpotifyFetch = (...args: Parameters<typeof fetch>) => Promise<Response>;

export async function refreshSpotifyToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  fetcher: SpotifyFetch = fetch,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const response = await fetcher("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (body?.error === "invalid_grant") {
      throw new SpotifyAPIError("Spotify connection expired. Please reconnect your account.", 401, true);
    }
    throw new SpotifyAPIError("Unable to refresh Spotify access. Please try again later.", response.status === 429 ? 429 : 502);
  }
  if (typeof body?.access_token !== "string" || !body.access_token ||
      typeof body.expires_in !== "number" || !Number.isFinite(body.expires_in) || body.expires_in <= 0) {
    throw new SpotifyAPIError("Spotify returned an invalid token response", 502);
  }
  return {
    accessToken: body.access_token,
    refreshToken: typeof body.refresh_token === "string" && body.refresh_token ? body.refresh_token : refreshToken,
    expiresIn: body.expires_in,
  };
}
