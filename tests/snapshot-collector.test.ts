import { expect, test } from "bun:test";
import { collectSnapshots, type CollectorStore, type SpotifyConnection } from "../supabase/functions/_shared/collector";
import { TIME_RANGES } from "../supabase/functions/_shared/snapshots";

function fixture(count = 1) {
  const connections = new Map<string, SpotifyConnection>(Array.from({ length: count }, (_, index) => {
    const user_id = String(index + 1).padStart(4, "0");
    return [user_id, { user_id, refresh_token: `refresh-${user_id}`, status: "connected" }];
  }));
  const requests: string[] = [];
  const pages: Array<string | undefined> = [];
  const saved: Array<{ expectedToken: string; values: Record<string, unknown> }> = [];
  const snapshots = new Set<string>();
  const sleeps: number[] = [];
  const refreshedStats: string[] = [];
  let onFetch: ((url: string, init?: RequestInit) => Promise<Response> | Response | undefined) | undefined;
  let failMetadata = false;
  const store: CollectorStore = {
    async listConnections(afterUserId) {
      pages.push(afterUserId);
      return [...connections.values()].filter(connection => connection.status === "connected" && (!afterUserId || connection.user_id > afterUserId))
        .slice(0, 2).map(connection => ({ ...connection }));
    },
    async hasSnapshot(userId, range) { return snapshots.has(`${userId}:${range}`); },
    async persistSnapshot(userId, range) {
      const key = `${userId}:${range}`;
      const skipped = snapshots.has(key);
      snapshots.add(key);
      return { snapshotId: key, skipped };
    },
    async refreshStats(userId) { refreshedStats.push(userId); },
    async updateConnection(expected, values) {
      saved.push({ expectedToken: expected.refresh_token, values });
      if (failMetadata) throw new Error("Database unavailable");
      const current = connections.get(expected.user_id);
      if (!current || current.refresh_token !== expected.refresh_token || current.status !== "connected") return false;
      Object.assign(current, values);
      return true;
    },
  };
  const run = () => collectSnapshots({
    store, clientId: "client", clientSecret: "secret", sleep: async milliseconds => { sleeps.push(milliseconds); },
    fetch: async (url, init) => {
      requests.push(url);
      const response = await onFetch?.(url, init);
      return response ?? Response.json(url.includes("/api/token") ? { access_token: "access", expires_in: 3600 } : { items: [] });
    },
  });
  return { connections, requests, pages, saved, snapshots, sleeps, refreshedStats, run,
    setFetch(handler: NonNullable<typeof onFetch>) { onFetch = handler; },
    failMetadata() { failMetadata = true; },
  };
}

test("keyset pagination processes connections beyond the first page", async () => {
  const context = fixture(5);
  const result = await context.run();
  expect(context.pages).toEqual([undefined, "0002", "0004", "0005"]);
  expect(result).toMatchObject({ processed: 5, succeeded: 5, failed: 0, deferred: 0 });
  expect(context.snapshots.size).toBe(15);
});

test("token refresh rate limit stops later batches and returns the full cooldown", async () => {
  const context = fixture(5);
  context.setFetch(() => new Response(null, { status: 429, headers: { "Retry-After": "120" } }));
  const result = await context.run();
  expect(result).toMatchObject({ processed: 2, succeeded: 0, failed: 2, deferred: 3, retryAfter: 120 });
  expect(context.requests.length).toBe(2);
  expect(context.sleeps).toEqual([]);
  expect(context.snapshots.size).toBe(0);
});

test("top-items rate limit stops all workers before another time range or batch", async () => {
  const context = fixture(4);
  context.setFetch(url => url.includes("/api/token") ? undefined : new Response(null, { status: 429, headers: { "Retry-After": "nonsense" } }));
  const result = await context.run();
  expect(result).toMatchObject({ failed: 2, deferred: 2, retryAfter: 60 });
  expect(context.requests.some(url => url.includes("medium_term") || url.includes("long_term"))).toBe(false);
  expect(context.sleeps).toEqual([]);
});

test("a partial Spotify failure keeps successful snapshots and retries only the missing range", async () => {
  const context = fixture();
  context.setFetch(url => url.includes("medium_term") ? new Response(null, { status: 503 }) : undefined);
  const first = await context.run();
  expect(first).toMatchObject({ succeeded: 0, failed: 1 });
  expect([...context.snapshots]).toEqual(["0001:short_term", "0001:long_term"]);
  context.requests.length = 0;
  context.setFetch(() => undefined);
  const retry = await context.run();
  expect(retry.succeeded).toBe(1);
  expect(context.requests.filter(url => !url.includes("/api/token"))).toHaveLength(2);
  expect(context.requests.filter(url => !url.includes("/api/token")).every(url => url.includes("medium_term"))).toBe(true);
});

test("completed same-day retries use no Spotify quota and repair artist aggregates", async () => {
  const context = fixture();
  for (const range of TIME_RANGES) context.snapshots.add(`0001:${range}`);
  expect((await context.run()).succeeded).toBe(1);
  expect(context.requests).toEqual([]);
  expect(context.refreshedStats).toEqual(["0001"]);
});

test("refresh rotation is saved before collecting, then metadata uses the new token", async () => {
  const context = fixture();
  context.setFetch(url => url.includes("/api/token") ? Response.json({ access_token: "new-access", refresh_token: "rotated" }) : undefined);
  expect((await context.run()).succeeded).toBe(1);
  expect(context.saved[0]).toEqual({ expectedToken: "refresh-0001", values: { refresh_token: "rotated" } });
  expect(context.saved[1].expectedToken).toBe("rotated");
  expect(context.connections.get("0001")?.refresh_token).toBe("rotated");
});

test("stale rotation cannot overwrite a connection replaced by reconnect", async () => {
  const context = fixture();
  context.setFetch(url => {
    if (!url.includes("/api/token")) return;
    context.connections.get("0001")!.refresh_token = "reconnected";
    return Response.json({ access_token: "access", refresh_token: "stale-rotation" });
  });
  expect((await context.run()).failed).toBe(1);
  expect(context.connections.get("0001")?.refresh_token).toBe("reconnected");
  expect(context.snapshots.size).toBe(0);
  expect(context.saved).toHaveLength(1);
});

test("invalid_grant from a stale token cannot revoke a newer connection", async () => {
  const context = fixture();
  context.setFetch(() => {
    context.connections.get("0001")!.refresh_token = "reconnected";
    return Response.json({ error: "invalid_grant" }, { status: 400 });
  });
  const result = await context.run();
  expect(result).toMatchObject({ failed: 1, revoked: 0 });
  expect(context.connections.get("0001")).toMatchObject({ refresh_token: "reconnected", status: "connected" });
});

test("invalid_grant revokes only the unchanged connection", async () => {
  const context = fixture();
  context.setFetch(() => Response.json({ error: "invalid_grant" }, { status: 400 }));
  expect((await context.run()).revoked).toBe(1);
  expect(context.connections.get("0001")?.status).toBe("revoked");
});

test("failed metadata writes report failure even after all rankings commit", async () => {
  const context = fixture();
  context.failMetadata();
  const result = await context.run();
  expect(result).toMatchObject({ failed: 1, succeeded: 0 });
  expect(result.errors[0].error).toContain("unable to save connection status");
  expect(context.snapshots.size).toBe(3);
});

test("bad application credentials stop subsequent batches without disabling user connections", async () => {
  const context = fixture(4);
  context.setFetch(() => Response.json({ error: "invalid_client" }, { status: 401 }));
  const result = await context.run();
  expect(result).toMatchObject({ failed: 2, deferred: 2 });
  expect([...context.connections.values()].every(connection => connection.status === "connected")).toBe(true);
});
