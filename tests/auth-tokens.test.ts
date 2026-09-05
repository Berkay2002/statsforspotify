import { describe, expect, test } from "bun:test";
import { applicationOrigin, safeNextPath } from "../lib/auth/redirects";
import { refreshSpotifyToken, type SpotifyFetch } from "../lib/spotify/token-refresh";
import { createSpotifyTokenCache } from "../lib/spotify/token-cache";
import { createBrowserTokenClient } from "../lib/spotify/browser-token";
import { getConnectionToken } from "../lib/spotify/connection-token";
import { SpotifyAPIError } from "../lib/spotify/errors";

const respond = (body: unknown, status = 200): SpotifyFetch =>
  (async () => Response.json(body, { status })) as SpotifyFetch;

describe("OAuth redirect boundaries", () => {
  test("accepts app paths and rejects external or ambiguous destinations", () => {
    expect(safeNextPath("/dashboard?range=long_term#artists")).toBe("/dashboard?range=long_term#artists");
    for (const value of [null, "https://evil.test", "//evil.test", "/\\evil.test", "/\nevil.test", "javascript:alert(1)"]) {
      expect(safeNextPath(value)).toBe("/dashboard");
    }
  });
  test("uses the configured origin and rejects non-HTTP schemes", () => {
    expect(applicationOrigin("https://untrusted.test/path", "https://stats.example/app")).toBe("https://stats.example");
    expect(applicationOrigin("http://localhost:3000/callback")).toBe("http://localhost:3000");
    expect(() => applicationOrigin("https://stats.example", "javascript:alert(1)")).toThrow();
  });
});

describe("Spotify refresh protocol", () => {
  test("sends server credentials to Spotify and preserves an omitted refresh token", async () => {
    const fetcher = (async (url, init) => {
      expect(url).toBe("https://accounts.spotify.com/api/token");
      expect(init?.cache).toBe("no-store");
      expect(new Headers(init?.headers).get("Authorization")).toBe(`Basic ${btoa("client:secret")}`);
      expect(new URLSearchParams(init?.body as URLSearchParams).get("refresh_token")).toBe("original");
      return Response.json({ access_token: "access", expires_in: 3600 });
    }) as SpotifyFetch;
    expect(await refreshSpotifyToken("original", "client", "secret", fetcher)).toEqual({ accessToken: "access", refreshToken: "original", expiresIn: 3600 });
  });
  test("accepts rotation and distinguishes expired grants from temporary failures", async () => {
    expect((await refreshSpotifyToken("old", "id", "secret", respond({ access_token: "access", expires_in: 60, refresh_token: "new" }))).refreshToken).toBe("new");
    for (const [body, status, reauth] of [[{ error: "invalid_grant" }, 400, true], [{ error: "invalid_client" }, 401, false], [{ error: "rate_limit" }, 429, false]] as const) {
      try { await refreshSpotifyToken("old", "id", "secret", respond(body, status)); throw new Error("Expected refresh failure"); }
      catch (error) { expect(error).toMatchObject({ shouldRefresh: reauth }); }
    }
    await expect(refreshSpotifyToken("old", "id", "secret", respond({ access_token: "access", expires_in: -1 }))).rejects.toThrow("invalid token response");
  });
});

describe("token lifetime and account isolation", () => {
  test("deduplicates concurrent refresh, isolates users, honors remaining lifetime and reconnect", async () => {
    let time = 0;
    let calls = 0;
    const cached = createSpotifyTokenCache(() => time);
    const refresh = async () => ({ accessToken: `access-${++calls}`, refreshToken: "refresh", expiresIn: 100 });
    const [one, two] = await Promise.all([cached("one", "refresh", refresh), cached("one", "refresh", refresh)]);
    expect(one).toEqual(two);
    expect(calls).toBe(1);
    expect((await cached("two", "refresh", refresh)).accessToken).toBe("access-2");
    time = 40_000;
    expect((await cached("one", "refresh", refresh)).expiresIn).toBe(60);
    time = 75_000;
    expect((await cached("one", "refresh", refresh)).accessToken).toBe("access-3");
    await cached("one", "reconnected", refresh);
    expect(calls).toBe(4);
    await cached("two", "refresh", refresh, true);
    expect(calls).toBe(5);
  });
  test("a failed refresh can be retried", async () => {
    const cached = createSpotifyTokenCache();
    await expect(cached("one", "refresh", async () => { throw new Error("offline"); })).rejects.toThrow("offline");
    expect((await cached("one", "refresh", async () => ({ accessToken: "ok", refreshToken: "refresh", expiresIn: 60 }))).accessToken).toBe("ok");
  });
  test("browser retries an unauthorized request once with forced refresh", async () => {
    const requests: string[] = [];
    const fetcher = (async (url, init) => {
      requests.push(String(url));
      if (String(url).startsWith("/api/spotify/token")) return Response.json({ accessToken: requests.length === 1 ? "old" : "new", expiresIn: 3600 });
      return new Headers(init?.headers).get("Authorization") === "Bearer old" ? new Response(null, { status: 401 }) : new Response(null, { status: 204 });
    }) as SpotifyFetch;
    const client = createBrowserTokenClient(fetcher);
    expect((await client.request("https://api.spotify.com/v1/me/player", { method: "PUT" })).status).toBe(204);
    expect(requests).toEqual(["/api/spotify/token", "https://api.spotify.com/v1/me/player", "/api/spotify/token?refresh=1", "https://api.spotify.com/v1/me/player"]);
  });
  test("late token responses cannot revive credentials after signout", async () => {
    let finish!: (response: Response) => void;
    const client = createBrowserTokenClient((() => new Promise(resolve => { finish = resolve; })) as SpotifyFetch);
    const pending = client.getToken();
    client.clear();
    finish(Response.json({ accessToken: "old-account", expiresIn: 3600 }));
    await expect(pending).rejects.toThrow("account changed");
  });
  test("forced browser refresh bypasses an unexpired credential", async () => {
    let calls = 0;
    const client = createBrowserTokenClient(async () => Response.json({ accessToken: `token-${++calls}`, expiresIn: 3600 }));
    expect(await client.getToken()).toBe("token-1");
    expect(await client.getToken()).toBe("token-1");
    expect(await client.getToken(true)).toBe("token-2");
  });
  test("signout during a retry prevents an old account response from being returned", async () => {
    let finish!: (response: Response) => void;
    let attempts = 0;
    const client = createBrowserTokenClient(async url => {
      if (String(url).startsWith("/api/spotify/token")) return Response.json({ accessToken: "token", expiresIn: 3600 });
      if (++attempts === 1) return new Response(null, { status: 401 });
      return new Promise(resolve => { finish = resolve; });
    });
    const pending = client.request("https://api.spotify.com/v1/me");
    while (!finish) await Bun.sleep(1);
    client.clear();
    finish(Response.json({ private: "old-account" }));
    await expect(pending).rejects.toThrow("account changed");
  });
  test("a lost refresh-token update rereads the new connection instead of caching stale credentials", async () => {
    let connection = "old";
    const refreshed: string[] = [];
    const cached = createSpotifyTokenCache();
    const store = {
      read: async () => ({ refreshToken: connection, status: "connected" }),
      save: async (previous: string, next: string) => {
        if (previous === "old") { connection = "reconnected"; return false; }
        connection = next;
        return true;
      },
      refresh: async (refreshToken: string) => {
        refreshed.push(refreshToken);
        return { accessToken: `access-${refreshToken}`, refreshToken: `rotated-${refreshToken}`, expiresIn: 3600 };
      },
      cached,
    };
    expect((await getConnectionToken("user", store)).accessToken).toBe("access-reconnected");
    expect((await getConnectionToken("user", store)).accessToken).toBe("access-reconnected");
    expect(refreshed).toEqual(["old", "reconnected"]);
  });
  test("repeated refresh-token conflicts fail after one retry", async () => {
    let calls = 0;
    await expect(getConnectionToken("user", {
      read: async () => ({ refreshToken: "old", status: "connected" }),
      save: async () => false,
      refresh: async () => { calls += 1; return { accessToken: "stale", refreshToken: "rotated", expiresIn: 60 }; },
      cached: createSpotifyTokenCache(),
    })).rejects.toThrow("connection changed");
    expect(calls).toBe(2);
  });
  test("a rejected old grant retries the credential installed by a concurrent reconnect", async () => {
    let stored = "old";
    let reads = 0;
    const attempts: string[] = [];
    const token = await getConnectionToken("user", {
      read: async () => { reads += 1; return { refreshToken: stored, status: "connected" }; },
      save: async () => true,
      refresh: async refreshToken => {
        attempts.push(refreshToken);
        if (refreshToken === "old") {
          stored = "reconnected";
          throw new SpotifyAPIError("Expired grant", 401, true);
        }
        return { accessToken: "new-access", refreshToken, expiresIn: 60 };
      },
      cached: createSpotifyTokenCache(),
    });
    expect(token.accessToken).toBe("new-access");
    expect(attempts).toEqual(["old", "reconnected"]);
    expect(reads).toBe(2);
  });
  test("an unchanged rejected grant is denied without retrying Spotify", async () => {
    let attempts = 0;
    const rejected = new SpotifyAPIError("Expired grant", 401, true);
    await expect(getConnectionToken("user", {
      read: async () => ({ refreshToken: "unchanged", status: "connected" }),
      save: async () => true,
      refresh: async () => { attempts += 1; throw rejected; },
      cached: createSpotifyTokenCache(),
    })).rejects.toBe(rejected);
    expect(attempts).toBe(1);
  });
  test("repeated grant replacement cannot extend the single retry budget", async () => {
    let reads = 0;
    let attempts = 0;
    const rejected = new SpotifyAPIError("Expired grant", 401, true);
    await expect(getConnectionToken("user", {
      read: async () => ({ refreshToken: `replacement-${++reads}`, status: "connected" }),
      save: async () => true,
      refresh: async () => { attempts += 1; throw rejected; },
      cached: createSpotifyTokenCache(),
    })).rejects.toBe(rejected);
    expect(attempts).toBe(2);
    expect(reads).toBe(2);
  });
});
