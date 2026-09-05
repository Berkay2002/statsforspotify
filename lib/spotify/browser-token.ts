import type { SpotifyFetch } from "./token-refresh";

// Instance owned by one provider, cleared on account changes and sign-out.
export function createBrowserTokenClient(fetcher: SpotifyFetch = fetch, now = Date.now) {
  let token: { accessToken: string; expiresAt: number } | null = null;
  let pending: Promise<string> | null = null;
  let generation = 0;

  async function getToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && token && token.expiresAt > now() + 30_000) return token.accessToken;
    if (pending) return pending;
    const started = generation;
    const requestedAt = now();
    pending = (async () => {
      const response = await fetcher(`/api/spotify/token${forceRefresh ? "?refresh=1" : ""}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || typeof data.accessToken !== "string" || !data.accessToken ||
          typeof data.expiresIn !== "number" || !Number.isFinite(data.expiresIn) || data.expiresIn <= 0) {
        throw new Error(data.error || "Unable to connect to Spotify. Please reconnect.");
      }
      if (started !== generation) throw new Error("Spotify account changed");
      token = { accessToken: data.accessToken, expiresAt: requestedAt + data.expiresIn * 1000 };
      return token.accessToken;
    })();
    try { return await pending; }
    finally { if (started === generation) pending = null; }
  }

  function clear() {
    generation += 1;
    token = null;
    pending = null;
  }

  async function request(url: string, init: RequestInit = {}) {
    let started = generation;
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${await getToken()}`);
    if (started !== generation) throw new Error("Spotify account changed");
    let response = await fetcher(url, { ...init, headers });
    if (started !== generation) throw new Error("Spotify account changed");
    if (response.status === 401) {
      clear();
      started = generation;
      headers.set("Authorization", `Bearer ${await getToken(true)}`);
      if (started !== generation) throw new Error("Spotify account changed");
      response = await fetcher(url, { ...init, headers });
      if (started !== generation) throw new Error("Spotify account changed");
    }
    return response;
  }

  return { getToken, request, clear };
}
