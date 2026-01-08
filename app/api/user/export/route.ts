import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/database";

type Snapshot = Database['public']['Tables']['snapshots']['Row'];
type ArtistRanking = Database['public']['Tables']['artist_rankings']['Row'];
type TrackRanking = Database['public']['Tables']['track_rankings']['Row'];
type AlbumRanking = Database['public']['Tables']['album_rankings']['Row'];

interface ExportData {
  exported_at: string;
  user_id: string;
  snapshots?: Snapshot[];
  artist_rankings?: ArtistRanking[];
  track_rankings?: TrackRanking[];
  album_rankings?: AlbumRanking[];
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";

  try {
    // Use the database function to export user data
    const { data, error } = await supabase.rpc("export_user_data", {
      target_user_id: user.id,
    });

    if (error) {
      console.error("Export user data error:", error);
      return NextResponse.json(
        { error: "Failed to export data" },
        { status: 500 }
      );
    }

    const exportData = data as ExportData;

    if (format === "csv") {
      // Convert to CSV format
      const csv = convertToCSV(exportData);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=spotify-stats-export.csv",
        },
      });
    }

    // Return JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=spotify-stats-export.json",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}

function convertToCSV(data: ExportData): string {
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
        `${artistRanking.id},${artistRanking.snapshot_id},${artistRanking.artist_id},"${escapeCSV(artistRanking.artist_name)}",${artistRanking.rank},${artistRanking.popularity},"${genres}",${artistRanking.created_at}`
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

  return lines.join("\n");
}

function escapeCSV(str: string): string {
  if (!str) return "";
  return str.replace(/"/g, '""');
}
