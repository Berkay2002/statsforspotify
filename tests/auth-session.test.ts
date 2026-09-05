import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

const user = { id: "00000000-0000-0000-0000-000000000001", aud: "authenticated", role: "authenticated", email: "test@example.invalid", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
const jwtPart = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const session = {
  access_token: `${jwtPart({ alg: "HS256", typ: "JWT" })}.${jwtPart({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.test-signature`,
  refresh_token: "supabase-refresh",
  provider_token: "spotify-access-secret",
  provider_refresh_token: "spotify-refresh-secret",
  token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user,
};
const cookieName = "sb-unit-test-auth-token";

async function withAuthServer(callback: (calls: string[]) => Promise<void>, authorized = true) {
  const savedFetch = globalThis.fetch;
  const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const savedKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const calls: string[] = [];
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://unit-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  globalThis.fetch = Object.assign(async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    calls.push(url);
    if (!url.startsWith("https://unit-test.supabase.co/auth/v1/")) throw new Error("Unexpected network request");
    return authorized ? Response.json(user) : Response.json({ code: "session_not_found", message: "Session not found" }, { status: 401 });
  }, { preconnect: savedFetch.preconnect });
  try { await callback(calls); }
  finally {
    globalThis.fetch = savedFetch;
    if (savedUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
    if (savedKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedKey;
  }
}

function request(path: string) {
  return new NextRequest(`https://stats.example${path}`, {
    headers: { cookie: `${cookieName}=base64-${jwtPart(session)}` },
  });
}

describe("auth proxy with real Supabase cookie serialization", () => {
  test("maintenance blocks API and OAuth writes before accessing auth and preserves cookies", async () => {
    const saved = process.env.MAINTENANCE_MODE;
    process.env.MAINTENANCE_MODE = "true";
    try {
      await withAuthServer(async calls => {
        for (const path of ["/", "/dashboard", "/auth/callback?code=test", "/api/snapshot"]) {
          const response = await proxy(request(path));
          expect(response.status).toBe(503);
          expect(response.headers.get("Retry-After")).toBe("60");
          expect(response.headers.get("Cache-Control")).toBe("private, no-store");
          expect(response.cookies.getAll()).toEqual([]);
        }
        expect(calls).toEqual([]);
      });
    } finally {
      if (saved === undefined) delete process.env.MAINTENANCE_MODE; else process.env.MAINTENANCE_MODE = saved;
    }
  });
  test("existing sessions cannot skip the OAuth callback", async () => {
    await withAuthServer(async calls => {
      const response = await proxy(request("/auth/callback?code=new-oauth-code"));
      expect(response.headers.get("Location")).toBeNull();
      expect(calls).toEqual([]);
    });
  });
  test("redirect keeps session cookies while stripping old provider credentials", async () => {
    await withAuthServer(async calls => {
      const response = await proxy(request("/"));
      expect(response.headers.get("Location")).toBe("https://stats.example/dashboard");
      expect(calls.length).toBeGreaterThan(0);
      const cookie = response.cookies.get(cookieName);
      expect(cookie).toBeDefined();
      const stored = JSON.parse(Buffer.from(cookie!.value.slice("base64-".length), "base64url").toString());
      expect(stored.access_token).toBe(session.access_token);
      expect(stored.refresh_token).toBe("supabase-refresh");
      expect(stored).not.toHaveProperty("provider_token");
      expect(stored).not.toHaveProperty("provider_refresh_token");
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    });
  });
  test("reconnect and error pages remain reachable with a Supabase session", async () => {
    await withAuthServer(async () => {
      for (const path of ["/?reauth=spotify", "/?error=login-failed"]) {
        expect((await proxy(request(path))).headers.get("Location")).toBeNull();
      }
    });
  });
  test("invalid sessions redirect to home and retain cookie deletion", async () => {
    await withAuthServer(async () => {
      const response = await proxy(request("/dashboard"));
      expect(response.headers.get("Location")).toBe("https://stats.example/");
      expect(response.cookies.get(cookieName)?.value).toBe("");
    }, false);
  });
});
