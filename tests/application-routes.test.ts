import { beforeEach, describe, expect, mock, test } from "bun:test";
import { NextRequest } from "next/server";

const owner = "00000000-0000-0000-0000-000000000001";
const friend = "00000000-0000-0000-0000-000000000002";
let authenticated = true;
let results: Array<{ data?: unknown; error?: unknown; count?: number }> = [];
let calls: Array<[string, ...unknown[]]> = [];

function query() {
  const builder = {
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve(results.shift() ?? { data: null, error: null }).then(resolve);
    },
  } as Record<string, unknown>;
  for (const method of ["select", "update", "insert", "delete", "eq", "or", "order", "limit", "maybeSingle", "in", "gte", "range"]) {
    builder[method] = (...args: unknown[]) => { calls.push([method, ...args]); return builder; };
  }
  return builder;
}

mock.module("../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: authenticated ? { id: owner } : null }, error: null }),
      signOut: async () => { calls.push(["signOut"]); return { error: null }; },
    },
    from: (table: string) => { calls.push(["from", table]); return query(); },
    rpc: (name: string, args: unknown) => { calls.push(["rpc", name, args]); return query(); },
  }),
}));

const { POST: accept } = await import("../app/api/friends/accept/route");
const { POST: follow } = await import("../app/api/friends/follow/route");
const { POST: unfollow } = await import("../app/api/friends/unfollow/route");
const { POST: deleteAccount } = await import("../app/api/user/delete-account/route");
const { GET: history } = await import("../app/api/rankings/history/route");
const { GET: sparklines } = await import("../app/api/rankings/sparklines/route");
const { GET: artistStats } = await import("../app/api/artists/[id]/stats/route");
const { PATCH: privacy } = await import("../app/api/user/privacy/route");

beforeEach(() => { authenticated = true; results = []; calls = []; });
const post = (body: unknown) => new Request("https://test.local", { method: "POST", body: JSON.stringify(body) });

describe("friendship routes", () => {
  test("anonymous callers never reach the database", async () => {
    authenticated = false;
    expect((await accept(post({ friendUserId: friend }))).status).toBe(401);
    expect(calls).toEqual([]);
  });
  test("accept requests exact count and returns 404 when no pending incoming request matches", async () => {
    results = [{ count: 0, error: null }];
    expect((await accept(post({ friendUserId: friend }))).status).toBe(404);
    expect(calls).toContainEqual(["update", { status: "accepted" }, { count: "exact" }]);
    expect(calls).toContainEqual(["eq", "friend_id", owner]);
    expect(calls).toContainEqual(["eq", "status", "pending"]);
  });
  test("valid incoming request succeeds", async () => {
    results = [{ count: 1, error: null }];
    expect((await accept(post({ friendUserId: friend }))).status).toBe(200);
  });
  test("malformed input and filter expressions are rejected before mutation", async () => {
    expect((await unfollow(post({ friendUserId: `${friend}),user_id.neq.null` }))).status).toBe(400);
    expect((await accept(post(null))).status).toBe(400);
    expect((await accept(new Request("https://test.local", { method: "POST", body: "{" }))).status).toBe(400);
    expect(calls).toEqual([]);
  });
  test("a failed friendship lookup never becomes a new pending request", async () => {
    results = [{ error: { message: "connection failed" } }];
    expect((await follow(post({ friendUserId: friend }))).status).toBe(500);
    expect(calls.some(([name]) => name === "insert")).toBe(false);
  });
});

describe("ranking routes", () => {
  test("an item missing from the latest snapshot has no current rank", async () => {
    results = [
      { data: [{ date: "2026-09-01T00:00:00Z", rank: 2, peak_rank: 2, is_new_entry: true, is_reentry: false, time_range: "medium_term" }] },
      { data: { id: "latest-snapshot" } },
      { data: null },
    ];
    const response = await history(new NextRequest("https://test.local/api/rankings/history?type=artist&id=artist"));
    expect(response.status).toBe(200);
    expect((await response.json()).metadata.currentRank).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  test("sparklines filter the selected range and target user before querying", async () => {
    results = [{ data: [] }];
    const response = await sparklines(new NextRequest(`https://test.local/api/rankings/sparklines?type=artist&ids=1234567890123456789012&time_range=short_term&user_id=${friend}`));
    expect(response.status).toBe(200);
    expect(calls).toContainEqual(["eq", "user_id", friend]);
    expect(calls).toContainEqual(["eq", "snapshots.time_range", "short_term"]);
  });
  test("days must be an integer, not a numeric prefix", async () => {
    for (const days of ["2bad", "1.5", "0", "366"]) {
      expect((await sparklines(new NextRequest(`https://test.local/api/rankings/sparklines?type=artist&ids=1234567890123456789012&days=${days}`))).status).toBe(400);
    }
    expect(calls).toEqual([]);
  });
  test("sparkline windows larger than the database response cap are not truncated", async () => {
    const row = { item_id: "1234567890123456789012", rank: 1, snapshots: { created_at: "2026-09-05T00:00:00Z" } };
    results = [{ data: Array.from({ length: 1000 }, () => row) }, { data: [row] }];
    const response = await sparklines(new NextRequest("https://test.local/api/rankings/sparklines?type=artist&ids=1234567890123456789012"));
    expect((await response.json()).sparklines[row.item_id]).toHaveLength(1001);
    expect(calls).toContainEqual(["range", 1000, 1999]);
  });
});

test("account deletion is a single atomic RPC before signout", async () => {
  results = [{ error: null }];
  expect((await deleteAccount()).status).toBe(200);
  expect(calls).toEqual([["rpc", "delete_user_account", { target_user_id: owner }], ["signOut"]]);
});

test("failed account deletion does not sign out or make separate destructive calls", async () => {
  results = [{ error: { message: "transaction aborted" } }];
  expect((await deleteAccount()).status).toBe(500);
  expect(calls).toEqual([["rpc", "delete_user_account", { target_user_id: owner }]]);
});

test("empty artist stats return zeros but a database failure returns an error", async () => {
  const context = { params: Promise.resolve({ id: "artist" }) };
  results = [{ data: null, error: null }];
  const empty = await artistStats(new NextRequest("https://test.local"), context);
  expect(await empty.json()).toEqual({ totalHoursListened: 0, uniqueTracksCount: 0, totalPlayCount: 0 });
  results = [{ error: { message: "connection failed" } }];
  expect((await artistStats(new NextRequest("https://test.local"), context)).status).toBe(500);
});

test("privacy rejects malformed bodies and never reports a missing profile as saved", async () => {
  expect((await privacy(post(null))).status).toBe(400);
  expect((await privacy(post({ stats_visibility: [] }))).status).toBe(400);
  expect(calls).toEqual([]);
  results = [{ count: 0, error: null }];
  expect((await privacy(post({ stats_visibility: "private" }))).status).toBe(404);
});
