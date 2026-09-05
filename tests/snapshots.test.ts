import { describe, expect, test } from "bun:test";
import { collectTimeRanges, parseSnapshotResult, prepareSnapshot, TIME_RANGES, utcDayBounds } from "../supabase/functions/_shared/snapshots";

describe("UTC snapshot days", () => {
  test("includes the final fractional second and crosses month/year boundaries", () => {
    expect(utcDayBounds(new Date("2025-12-31T23:59:59.999Z"))).toEqual({
      date: "2025-12-31", start: "2025-12-31T00:00:00.000Z", end: "2026-01-01T00:00:00.000Z",
    });
    expect(utcDayBounds(new Date("2026-09-06T01:00:00+02:00")).date).toBe("2026-09-05");
  });
});

test("album ranking uses frequency with original track order breaking ties", () => {
  const tracks = ["b", "a", "a", "c", "b"].map((albumId, index) => ({
    id: `track-${index}`, name: `Track ${index}`, rank: index + 1, imageUrl: null,
    artistId: "artist", artistName: "Artist", albumId, albumName: albumId, durationMs: 1000,
  }));
  const payload = prepareSnapshot([], tracks);
  expect(payload.p_albums.map(album => [album.album_id, album.track_count, album.rank])).toEqual([
    ["b", 2, 1], ["a", 2, 2], ["c", 1, 3],
  ]);
  expect(payload.p_tracks[0].popularity).toBeNull();
  expect(prepareSnapshot([], [])).toEqual({ p_artists: [], p_tracks: [], p_albums: [] });
});

test("one range failing does not discard successful ranges and retries are explicit", async () => {
  const visited: string[] = [];
  const results = await collectTimeRanges(TIME_RANGES, async range => {
    visited.push(range);
    if (range === "medium_term") throw new Error("Spotify unavailable");
    return { snapshotId: range, skipped: range === "short_term" };
  });
  expect(visited).toEqual([...TIME_RANGES]);
  expect(results.map(result => result.success)).toEqual([true, false, true]);
  expect(results[0].skipped).toBe(true);
  expect(results[1].error).toBe("Spotify unavailable");
});

test("malformed persistence response never reports success", () => {
  expect(() => parseSnapshotResult(null)).toThrow();
  expect(() => parseSnapshotResult({ snapshotId: "x" })).toThrow();
  expect(parseSnapshotResult({ snapshotId: "x", skipped: false })).toEqual({ snapshotId: "x", skipped: false });
});
