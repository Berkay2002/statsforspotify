import { describe, expect, test } from "bun:test";
import { readJsonObject, isUuid } from "../lib/api/validation";
import { convertToCSV, escapeCSV } from "../lib/export-data";
import { getRankDelta, getRankMovement, getRankMovementFromSeries } from "../lib/rank-change";

describe("request validation", () => {
  test("UUID filters reject PostgREST expressions and non-string JSON values", () => {
    expect(isUuid("00000000-0000-0000-0000-000000000001")).toBe(true);
    for (const value of [null, 5, {}, [], "", "id),user_id.neq.null", "not-a-uuid"]) {
      expect(isUuid(value)).toBe(false);
    }
  });

  test("malformed, null, array, and primitive bodies are rejected", async () => {
    for (const body of ["{", "null", "[]", "123", '"hello"']) {
      expect(await readJsonObject(new Request("https://test.local", { method: "POST", body }))).toBeNull();
    }
    expect(await readJsonObject(new Request("https://test.local", { method: "POST", body: '{"stats_visibility":"private"}' })))
      .toEqual({ stats_visibility: "private" });
  });
});

describe("CSV export", () => {
  test("preserves quotes and line breaks while making formula text literal", () => {
    expect(escapeCSV('Artist "name", live\nrecording')).toBe('Artist ""name"", live\nrecording');
    for (const value of ["=1+1", "+SUM(A1)", "-1+1", "@SUM(A1)", "  =1", "\ttext", "\ntext"]) {
      expect(escapeCSV(value)).toBe(`'${value}`);
    }
  });

  test("exports empty history and additional account data without dropping sections", () => {
    const csv = convertToCSV({
      exported_at: "2026-09-05T00:00:00Z", user_id: "owner",
      snapshots: [], artist_rankings: [], track_rankings: [], album_rankings: [],
      profile: { display_name: '=HYPERLINK("url")', stats_visibility: "private" },
      friendships: [{ user_id: "owner", friend_id: "friend", status: "pending" }],
      artist_listening_stats: [{ artist_id: "artist", total_play_count: 2 }],
      spotify_connection: { last_snapshot_at: null },
    });
    expect(csv).toContain('"\'=HYPERLINK(""url"")"');
    expect(csv).toContain("## FRIENDSHIPS");
    expect(csv).toContain("## ARTIST LISTENING STATS");
    expect(csv).toContain("## SPOTIFY CONNECTION");
    expect(csv).not.toContain("undefined");
  });
});

describe("rank direction", () => {
  test("smaller ranks improve and missing ranks are new entries", () => {
    expect(getRankMovement({ previousRank: 10, currentRank: 3 })).toEqual({ movement: "improved", delta: 7 });
    expect(getRankMovement({ previousRank: 3, currentRank: 10 })).toEqual({ movement: "declined", delta: -7 });
    expect(getRankMovement({ previousRank: 3, currentRank: 3 })).toEqual({ movement: "unchanged", delta: 0 });
    expect(getRankDelta({ previousRank: null, currentRank: 3 })).toBeNull();
    expect(getRankMovement({ previousRank: undefined, currentRank: 3 })).toEqual({ movement: "new", delta: null });
  });

  test("window and latest comparison remain distinct, including empty history", () => {
    expect(getRankMovementFromSeries({ ranks: [] })).toBeNull();
    expect(getRankMovementFromSeries({ ranks: [1] })).toBeNull();
    expect(getRankMovementFromSeries({ ranks: [10, 1, 3] })).toEqual({ movement: "improved", delta: 7 });
    expect(getRankMovementFromSeries({ ranks: [10, 1, 3], comparison: "most_recent" })).toEqual({ movement: "declined", delta: -2 });
  });
});
