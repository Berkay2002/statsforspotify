import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

    if (format === "csv") {
      // Convert to CSV format
      const csv = convertToCSV(data);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=spotify-stats-export.csv",
        },
      });
    }

    // Return JSON
    return new NextResponse(JSON.stringify(data, null, 2), {
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

function convertToCSV(data: any): string {
  const lines: string[] = [];

  // Add header info
  lines.push("# Spotify Stats Export");
  lines.push(`# Exported at: ${data.exported_at}`);
  lines.push(`# User ID: ${data.user_id}`);
  lines.push("");

  // Snapshots
  if (data.snapshots?.length > 0) {
    lines.push("## SNAPSHOTS");
    lines.push("id,user_id,time_range,created_at");
    data.snapshots.forEach((s: any) => {
      lines.push(`${s.id},${s.user_id},${s.time_range},${s.created_at}`);
    });
    lines.push("");
  }

  // Artist Rankings
  if (data.artist_rankings?.length > 0) {
    lines.push("## ARTIST RANKINGS");
    lines.push("id,snapshot_id,artist_id,artist_name,rank,popularity,genres,created_at");
    data.artist_rankings.forEach((a: any) => {
      const genres = Array.isArray(a.genres) ? a.genres.join(";") : "";
      lines.push(
        `${a.id},${a.snapshot_id},${a.artist_id},"${escapeCSV(a.artist_name)}",${a.rank},${a.popularity},"${genres}",${a.created_at}`
      );
    });
    lines.push("");
  }

  // Track Rankings
  if (data.track_rankings?.length > 0) {
    lines.push("## TRACK RANKINGS");
    lines.push("id,snapshot_id,track_id,track_name,artist_name,album_name,rank,popularity,duration_ms,created_at");
    data.track_rankings.forEach((t: any) => {
      lines.push(
        `${t.id},${t.snapshot_id},${t.track_id},"${escapeCSV(t.track_name)}","${escapeCSV(t.artist_name)}","${escapeCSV(t.album_name)}",${t.rank},${t.popularity},${t.duration_ms},${t.created_at}`
      );
    });
    lines.push("");
  }

  // Album Rankings
  if (data.album_rankings?.length > 0) {
    lines.push("## ALBUM RANKINGS");
    lines.push("id,snapshot_id,album_id,album_name,artist_name,rank,track_count,created_at");
    data.album_rankings.forEach((a: any) => {
      lines.push(
        `${a.id},${a.snapshot_id},${a.album_id},"${escapeCSV(a.album_name)}","${escapeCSV(a.artist_name)}",${a.rank},${a.track_count},${a.created_at}`
      );
    });
  }

  return lines.join("\n");
}

function escapeCSV(str: string): string {
  if (!str) return "";
  return str.replace(/"/g, '""');
}
