import { beforeEach, expect, mock, test } from "bun:test";

let authenticated = true;
let existing: Array<{ time_range: string; created_at: string }> = [];
let readError: unknown = null;
let failedRanges = new Set<string>();
let persisted: string[] = [];
let fetched: string[] = [];
let aggregateCalls = 0;
let aggregateError: unknown = null;
let persistenceResult: unknown = { snapshotId: "snapshot", skipped: false };

const query = {
  select() { return this; }, eq() { return this; }, gte() { return this; }, lt() { return this; },
  then(resolve: (value: unknown) => unknown) {
    return Promise.resolve({ data: existing, error: readError }).then(resolve);
  },
};
mock.module("../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: authenticated ? { id: "owner" } : null }, error: null }) },
    from: () => query,
    rpc: async (name: string, args?: { p_time_range: string }) => {
      if (name === "update_artist_listening_stats") {
        aggregateCalls++;
        return { error: aggregateError };
      }
      persisted.push(args!.p_time_range);
      return { data: persistenceResult, error: null };
    },
  }),
}));
mock.module("../lib/spotify/api", () => ({
  getTopArtists: async (timeRange: string) => {
    fetched.push(timeRange);
    if (failedRanges.has(timeRange)) throw new Error("Spotify temporarily unavailable");
    return [];
  },
  getTopTracks: async () => [],
}));
const { POST } = await import("../app/api/snapshot/route");

beforeEach(() => {
  authenticated = true; existing = []; readError = null; failedRanges = new Set();
  persisted = []; fetched = []; aggregateCalls = 0; aggregateError = null;
  persistenceResult = { snapshotId: "snapshot", skipped: false };
});

test("unauthenticated snapshot requests do not fetch or write", async () => {
  authenticated = false;
  expect((await POST()).status).toBe(401);
  expect(fetched).toEqual([]);
  expect(persisted).toEqual([]);
});

test("a failed existing-snapshot query does not collect with missing history", async () => {
  readError = { message: "connection failed" };
  expect((await POST()).status).toBe(500);
  expect(fetched).toEqual([]);
  expect(persisted).toEqual([]);
});

test("a same-day retry skips all ranges already committed", async () => {
  existing = ["short_term", "medium_term", "long_term"].map(time_range => ({ time_range, created_at: new Date().toISOString() }));
  const response = await POST();
  expect(response.status).toBe(200);
  expect((await response.json()).skipped).toBe(true);
  expect(fetched).toEqual([]);
  expect(aggregateCalls).toBe(1);
});

test("failed aggregate repair on an already collected day remains retryable", async () => {
  existing = ["short_term", "medium_term", "long_term"].map(time_range => ({ time_range, created_at: new Date().toISOString() }));
  aggregateError = { message: "database unavailable" };
  expect((await POST()).status).toBe(500);
  expect(aggregateCalls).toBe(1);
  expect(fetched).toEqual([]);
});

test("partial success preserves successful ranges and the next request fills only gaps", async () => {
  failedRanges.add("medium_term");
  const response = await POST();
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.success).toBe(true);
  expect(body.newSnapshots).toBe(2);
  expect(body.results.map((result: { success: boolean }) => result.success)).toEqual([true, false, true]);
  expect(persisted).toEqual(["short_term", "long_term"]);
  expect(aggregateCalls).toBe(0);

  existing = persisted.map(time_range => ({ time_range, created_at: new Date().toISOString() }));
  fetched = []; persisted = []; failedRanges.clear();
  const retry = await POST();
  expect(retry.status).toBe(200);
  expect(fetched).toEqual(["medium_term"]);
  expect(persisted).toEqual(["medium_term"]);
  expect((await retry.json()).newSnapshots).toBe(1);
});

test("concurrent persistence winners report skipped instead of new snapshots", async () => {
  persistenceResult = { snapshotId: "other-collector-snapshot", skipped: true };
  const response = await POST();
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(body.skipped).toBe(true);
  expect(body.newSnapshots).toBe(0);
  expect(aggregateCalls).toBe(0);
});

test("malformed persistence results cannot be reported as successful collection", async () => {
  persistenceResult = { snapshotId: "snapshot" };
  const response = await POST();
  expect(response.status).toBe(502);
  const body = await response.json();
  expect(body.success).toBe(false);
  expect(body.succeeded).toBe(0);
});
