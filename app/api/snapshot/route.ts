import { createClient } from "@/lib/supabase/server";
import { getTopArtists, getTopTracks, extractAlbumsFromTracks } from "@/lib/spotify/api";
import { NextResponse } from "next/server";
import { validateAuth, unauthorizedResponse, serverErrorResponse } from "@/lib/api/utils";
import type { TimeRange } from "@/lib/spotify/types";

// Allow one snapshot per 24 hours for auto-collection
const SNAPSHOT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(request: Request) {
  try {
    const user = await validateAuth();
    if (!user) {
      return unauthorizedResponse();
    }

    const supabase = await createClient();

    // Check if snapshot is needed
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
      const timeSinceLastSnapshot = now - lastSnapshotTime;
      
      // If snapshot is less than 24 hours old, skip collection
      if (timeSinceLastSnapshot < SNAPSHOT_INTERVAL_MS) {
        return NextResponse.json(
          { 
            success: true, 
            skipped: true, 
            message: "Snapshot is up to date",
            lastSnapshot: lastSnapshot.created_at
          },
          { status: 200 }
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

    // Update artist listening stats
    const { error: statsError } = await supabase.rpc("update_artist_listening_stats");

    if (statsError) {
      console.error("Failed to update artist stats:", statsError);
    }

    return NextResponse.json(
      { 
        success: true, 
        message: "Snapshot collected successfully",
        snapshotId: snapshot.id
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Snapshot error:", error);
    return serverErrorResponse("Failed to collect snapshot");
  }
}
