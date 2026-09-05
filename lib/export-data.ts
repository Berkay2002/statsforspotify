import type { Database } from "@/lib/supabase/database";

type Snapshot = Database['public']['Tables']['snapshots']['Row'];
type ArtistRanking = Database['public']['Tables']['artist_rankings']['Row'];
type TrackRanking = Database['public']['Tables']['track_rankings']['Row'];
type AlbumRanking = Database['public']['Tables']['album_rankings']['Row'];

export interface ExportData {
  exported_at: string;
  user_id: string;
  snapshots?: Snapshot[];
  artist_rankings?: ArtistRanking[];
  track_rankings?: TrackRanking[];
  album_rankings?: AlbumRanking[];
  profile?: Record<string, unknown> | null;
  friendships?: Record<string, unknown>[];
  artist_listening_stats?: Record<string, unknown>[];
  spotify_connection?: Record<string, unknown> | null;
}


export function convertToCSV(data: ExportData): string {
  const lines: string[] = [];

  // Add header info
  lines.push("# Spotify Stats Export");
  lines.push(`# Exported at: ${data.exported_at}`);
  lines.push(`# User ID: ${data.user_id}`);
  lines.push("");

  // Snapshots
  if (data.snapshots && data.snapshots.length > 0) {
    lines.push("## SNAPSHOTS");
    lines.push("id,user_id,time_range,created_at");
    data.snapshots.forEach((snapshot: Snapshot) => {
      lines.push(`${snapshot.id},${snapshot.user_id},${snapshot.time_range},${snapshot.created_at}`);
    });
    lines.push("");
  }

  // Artist Rankings
  if (data.artist_rankings && data.artist_rankings.length > 0) {
    lines.push("## ARTIST RANKINGS");
    lines.push("id,snapshot_id,artist_id,artist_name,rank,popularity,genres,created_at");
    data.artist_rankings.forEach((artistRanking: ArtistRanking) => {
      const genres = Array.isArray(artistRanking.genres) ? artistRanking.genres.join(";") : "";
      lines.push(
        `${artistRanking.id},${artistRanking.snapshot_id},${artistRanking.artist_id},"${escapeCSV(artistRanking.artist_name)}",${artistRanking.rank},${artistRanking.popularity},"${escapeCSV(genres)}",${artistRanking.created_at}`
      );
    });
    lines.push("");
  }

  // Track Rankings
  if (data.track_rankings && data.track_rankings.length > 0) {
    lines.push("## TRACK RANKINGS");
    lines.push("id,snapshot_id,track_id,track_name,artist_name,album_name,rank,popularity,duration_ms,created_at");
    data.track_rankings.forEach((trackRanking: TrackRanking) => {
      lines.push(
        `${trackRanking.id},${trackRanking.snapshot_id},${trackRanking.track_id},"${escapeCSV(trackRanking.track_name)}","${escapeCSV(trackRanking.artist_name)}","${escapeCSV(trackRanking.album_name)}",${trackRanking.rank},${trackRanking.popularity},${trackRanking.duration_ms},${trackRanking.created_at}`
      );
    });
    lines.push("");
  }

  // Album Rankings
  if (data.album_rankings && data.album_rankings.length > 0) {
    lines.push("## ALBUM RANKINGS");
    lines.push("id,snapshot_id,album_id,album_name,artist_name,rank,track_count,created_at");
    data.album_rankings.forEach((albumRanking: AlbumRanking) => {
      lines.push(
        `${albumRanking.id},${albumRanking.snapshot_id},${albumRanking.album_id},"${escapeCSV(albumRanking.album_name)}","${escapeCSV(albumRanking.artist_name)}",${albumRanking.rank},${albumRanking.track_count},${albumRanking.created_at}`
      );
    });
  }

  for (const [title, rows] of [
    ["PROFILE", data.profile ? [data.profile] : []],
    ["FRIENDSHIPS", data.friendships ?? []],
    ["ARTIST LISTENING STATS", data.artist_listening_stats ?? []],
    ["SPOTIFY CONNECTION", data.spotify_connection ? [data.spotify_connection] : []],
  ] as const) {
    if (!rows.length) continue;
    const columns = Object.keys(rows[0]);
    lines.push("", `## ${title}`, columns.join(","));
    for (const row of rows) {
      lines.push(columns.map((column) => {
        const value = row[column];
        const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
        return `"${escapeCSV(text)}"`;
      }).join(","));
    }
  }

  return lines.join("\n");
}

export function escapeCSV(value: string): string {
  if (!value) return "";
  // Quotes alone do not stop spreadsheets from evaluating formula-like text.
  const literal = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
  return literal.replace(/"/g, '""');
}
