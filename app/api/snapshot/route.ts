import { createClient } from "@/lib/supabase/server";
import { getTopArtists, getTopTracks, extractAlbumsFromTracks } from "@/lib/spotify/api";
import { NextResponse } from "next/server";
import type { TimeRange } from "@/lib/spotify/types";

// Rate limiting - allow one snapshot per hour per user
const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check rate limit - get last snapshot
    const { data: lastSnapshot } = await supabase
      .from("snapshots")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastSnapshot) {
      const lastSnapshotTime = new Date(lastSnapshot.created_at).getTime();
      const now = Date.now();
      if (now - lastSnapshotTime < RATE_LIMIT_MS) {
        const remainingMs = RATE_LIMIT_MS - (now - lastSnapshotTime);
        const remainingMins = Math.ceil(remainingMs / 60000);
        return NextResponse.json(
          { error: `Rate limited. Try again in ${remainingMins} minutes.` },
          { status: 429 }
        );
      }
    }

    // Get time range from request body (default to medium_term)
    let timeRange: TimeRange = "medium_term";
    try {
      const body = await request.json();
      if (body.timeRange && ["short_term", "medium_term", "long_term"].includes(body.timeRange)) {
        timeRange = body.timeRange;
      }
    } catch {
      // No body or invalid JSON, use default
    }

    // Fetch current top items from Spotify
    const [artists, tracks] = await Promise.all([
      getTopArtists(timeRange, 50),
      getTopTracks(timeRange, 50),
    ]);
    const albums = extractAlbumsFromTracks(tracks);

    // Create snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from("snapshots")
      .insert({
        user_id: user.id,
        time_range: timeRange,
      })
      .select()
      .single();

    if (snapshotError || !snapshot) {
      console.error("Failed to create snapshot:", snapshotError);
      return NextResponse.json(
        { error: "Failed to create snapshot" },
        { status: 500 }
      );
    }

    // Insert artist rankings
    const artistRankings = artists.map((artist) => ({
      snapshot_id: snapshot.id,
      user_id: user.id,
      artist_id: artist.id,
      artist_name: artist.name,
      artist_image_url: artist.imageUrl,
      genres: artist.genres,
      popularity: artist.popularity,
      rank: artist.rank,
    }));

    const { error: artistError } = await supabase
      .from("artist_rankings")
      .insert(artistRankings);

    if (artistError) {
      console.error("Failed to insert artist rankings:", artistError);
    }

    // Insert track rankings
    const trackRankings = tracks.map((track) => ({
      snapshot_id: snapshot.id,
      user_id: user.id,
      track_id: track.id,
      track_name: track.name,
      track_image_url: track.imageUrl,
      artist_id: track.artistId,
      artist_name: track.artistName,
      album_id: track.albumId,
      album_name: track.albumName,
      duration_ms: track.durationMs,
      popularity: track.popularity,
      rank: track.rank,
    }));

    const { error: trackError } = await supabase
      .from("track_rankings")
      .insert(trackRankings);

    if (trackError) {
      console.error("Failed to insert track rankings:", trackError);
    }

    // Insert album rankings
    const albumRankings = albums.map((album) => ({
      snapshot_id: snapshot.id,
      user_id: user.id,
      album_id: album.id,
      album_name: album.name,
      album_image_url: album.imageUrl,
      artist_id: album.artistId,
      artist_name: album.artistName,
      track_count: album.trackCount,
      rank: album.rank,
    }));

    const { error: albumError } = await supabase
      .from("album_rankings")
      .insert(albumRankings);

    if (albumError) {
      console.error("Failed to insert album rankings:", albumError);
    }

    // Redirect back to dashboard with success
    return NextResponse.redirect(
      new URL("/dashboard?snapshot=success", request.url)
    );
  } catch (error) {
    console.error("Snapshot error:", error);
    return NextResponse.json(
      { error: "Failed to collect snapshot" },
      { status: 500 }
    );
  }
}
