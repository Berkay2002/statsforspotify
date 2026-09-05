// Pure snapshot preparation shared by Next.js and the scheduled Deno collector.
export const TIME_RANGES = ["short_term", "medium_term", "long_term"] as const;
export type SnapshotTimeRange = (typeof TIME_RANGES)[number];

export interface SnapshotArtist {
  id: string;
  name: string;
  rank: number;
  imageUrl: string | null;
  genres: string[];
  popularity?: number | null;
}

export interface SnapshotTrack {
  id: string;
  name: string;
  rank: number;
  imageUrl: string | null;
  artistId: string;
  artistName: string;
  albumId: string;
  albumName: string;
  durationMs: number;
  popularity?: number | null;
}

export function utcDayBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return {
    date: start.toISOString().slice(0, 10),
    start: start.toISOString(),
    end: new Date(start.getTime() + 86_400_000).toISOString(),
  };
}

export function deriveAlbums(tracks: SnapshotTrack[]) {
  const albums = new Map<string, {
    album_id: string; album_name: string; album_image_url: string | null;
    artist_id: string; artist_name: string; track_count: number;
  }>();
  for (const track of tracks) {
    const album = albums.get(track.albumId);
    if (album) album.track_count++;
    else albums.set(track.albumId, {
      album_id: track.albumId, album_name: track.albumName, album_image_url: track.imageUrl,
      artist_id: track.artistId, artist_name: track.artistName, track_count: 1,
    });
  }
  return [...albums.values()].sort((a, b) => b.track_count - a.track_count)
    .map((album, index) => ({ ...album, rank: index + 1 }));
}

export function prepareSnapshot(artists: SnapshotArtist[], tracks: SnapshotTrack[]) {
  return {
    p_artists: artists.map(artist => ({
      artist_id: artist.id, artist_name: artist.name, artist_image_url: artist.imageUrl,
      genres: artist.genres, popularity: artist.popularity ?? null, rank: artist.rank,
    })),
    p_tracks: tracks.map(track => ({
      track_id: track.id, track_name: track.name, track_image_url: track.imageUrl,
      artist_id: track.artistId, artist_name: track.artistName, album_id: track.albumId,
      album_name: track.albumName, duration_ms: track.durationMs,
      popularity: track.popularity ?? null, rank: track.rank,
    })),
    p_albums: deriveAlbums(tracks),
  };
}

export interface SnapshotResult {
  snapshotId: string;
  skipped: boolean;
}

export function parseSnapshotResult(value: unknown): SnapshotResult {
  if (!value || typeof value !== "object" || !("snapshotId" in value) ||
      typeof value.snapshotId !== "string" || !("skipped" in value) || typeof value.skipped !== "boolean") {
    throw new Error("Invalid snapshot persistence response");
  }
  return { snapshotId: value.snapshotId, skipped: value.skipped };
}

export async function collectTimeRanges(
  ranges: readonly SnapshotTimeRange[],
  collect: (range: SnapshotTimeRange) => Promise<SnapshotResult>,
) {
  const results: Array<{ timeRange: SnapshotTimeRange; success: boolean; skipped?: boolean; error?: string }> = [];
  for (const timeRange of ranges) {
    try {
      const result = await collect(timeRange);
      results.push({ timeRange, success: true, skipped: result.skipped });
    } catch (error) {
      results.push({ timeRange, success: false, error: error instanceof Error ? error.message : "Snapshot collection failed" });
    }
  }
  return results;
}
