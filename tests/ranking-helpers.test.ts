import { beforeEach, expect, mock, test } from "bun:test";

type QueryResult = { data: unknown; error: unknown };
const snapshotResults = new Map<string, QueryResult>();
const rankingResults = new Map<string, QueryResult>();
const queriedTables: string[] = [];

mock.module("../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "owner" } }, error: null }) },
    from(table: string) {
      queriedTables.push(table);
      let filter: string;
      return {
        select() { return this; },
        eq(column: string, value: string) {
          if (column === "time_range" || column === "snapshot_id") filter = value;
          return this;
        },
        order() { return this; }, limit() { return this; }, maybeSingle() { return this; },
        then(resolve: (value: QueryResult) => unknown) {
          const results = table === "snapshots" ? snapshotResults : rankingResults;
          return Promise.resolve(results.get(filter) ?? { data: null, error: null }).then(resolve);
        },
      };
    },
  }),
}));
mock.module("../lib/spotify/api", () => ({
  getTopArtists: async () => [{ id: "current", name: "Artist", rank: 1 }],
  getTopTracks: async () => [{ id: "current", name: "Track", rank: 1 }],
  getTopAlbums: async () => [{ id: "current", name: "Album", rank: 1 }],
}));

const { fetchArtistsByTimeRange, fetchTracksByTimeRange, fetchAlbumsByTimeRange } = await import("../lib/spotify/helpers");

beforeEach(() => { snapshotResults.clear(); rankingResults.clear(); queriedTables.length = 0; });

for (const [kind, fetchRankings] of [
  ["artist", fetchArtistsByTimeRange],
  ["track", fetchTracksByTimeRange],
  ["album", fetchAlbumsByTimeRange],
] as const) {
  test(`${kind} rankings preserve legitimate empty snapshot history`, async () => {
    const result = await fetchRankings();
    expect(result.short_term[0].previous_rank).toBeNull();
    expect(result.medium_term[0].previous_rank).toBeNull();
    expect(result.long_term[0].previous_rank).toBeNull();
    expect(queriedTables).toEqual(["snapshots", "snapshots", "snapshots"]);
  });

  test(`${kind} rankings do not relabel items as new after a snapshot read fails`, async () => {
    snapshotResults.set("medium_term", { data: null, error: { code: "connection_failure" } });
    await expect(fetchRankings()).rejects.toThrow("Failed to fetch previous snapshot");
    expect(queriedTables.every(table => table === "snapshots")).toBe(true);
  });

  test(`${kind} rankings do not relabel items as new after a previous ranking read fails`, async () => {
    snapshotResults.set("short_term", { data: { id: "previous" }, error: null });
    rankingResults.set("previous", { data: null, error: { code: "connection_failure" } });
    await expect(fetchRankings()).rejects.toThrow("Failed to fetch previous rankings");
    expect(queriedTables).toContain(`${kind}_rankings`);
  });

  test(`${kind} rankings preserve known previous positions and treat absent items as new`, async () => {
    snapshotResults.set("short_term", { data: { id: "previous-short" }, error: null });
    snapshotResults.set("medium_term", { data: { id: "previous-medium" }, error: null });
    rankingResults.set("previous-short", { data: [{ [`${kind}_id`]: "current", rank: 4 }], error: null });
    rankingResults.set("previous-medium", { data: [], error: null });
    const result = await fetchRankings();
    expect(result.short_term[0].previous_rank).toBe(4);
    expect(result.medium_term[0].previous_rank).toBeNull();
    expect(result.long_term[0].previous_rank).toBeNull();
  });
}
