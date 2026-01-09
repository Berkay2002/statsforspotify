// Production-Ready Supabase Edge Function for Spotify Snapshots
// 
// Deploy to: supabase/functions/collect-snapshots/index.ts
// 
// To set up pg_cron job, run this SQL in Supabase:
// 
// SELECT cron.schedule(
//   'collect-daily-snapshots',
//   '0 6 * * *', -- Run at 6 AM UTC daily
//   $$
//   SELECT net.http_post(
//     url := 'https://your-project.supabase.co/functions/v1/collect-snapshots',
//     headers := jsonb_build_object(
//       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
//       'Content-Type', 'application/json'
//     ),
//     body := '{}'::jsonb
//   );
//   $$
// );

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const MAX_CONCURRENT_USERS = 5; // Limit concurrent Spotify API calls
const TIME_RANGES = ["short_term", "medium_term", "long_term"] as const;

// ============================================================================
// Types
// ============================================================================

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images?: SpotifyImage[];
  genres?: string[];
  popularity?: number;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  images?: SpotifyImage[];
}

interface SpotifyTrack {
  id: string;
  name: string;
  album: SpotifyAlbum;
  artists: SpotifyArtist[];
  duration_ms: number;
  popularity: number;
}

interface SpotifyConnection {
  user_id: string;
  refresh_token: string;
  status: string;
}

interface ProcessingResult {
  processed: number;
  succeeded: number;
  failed: number;
  revoked: number;
  errors: Array<{ user_id: string; error: string; type: string }>;
}

enum ErrorType {
  REVOKED = "revoked",
  RATE_LIMIT = "rate_limit",
  TRANSIENT = "transient",
  FATAL = "fatal",
}

// ============================================================================
// Token Refresh with Error Classification
// ============================================================================

async function refreshSpotifyToken(
  refreshToken: string
): Promise<{ accessToken: string; errorType?: ErrorType }> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(
        `${Deno.env.get("SPOTIFY_CLIENT_ID")}:${Deno.env.get(
          "SPOTIFY_CLIENT_SECRET"
        )}`
      )}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  // Handle rate limiting with Retry-After
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    throw {
      errorType: ErrorType.RATE_LIMIT,
      message: `Rate limited. Retry after ${retryAfter || "unknown"} seconds`,
      retryAfter: retryAfter ? parseInt(retryAfter) : 60,
    };
  }

  // Handle revoked tokens - user revoked access
  if (response.status === 400) {
    const errorData = await response.json();
    if (errorData.error === "invalid_grant") {
      throw {
        errorType: ErrorType.REVOKED,
        message: "Refresh token revoked by user",
      };
    }
  }

  // Handle client authentication errors (our credentials are wrong)
  if (response.status === 401) {
    throw {
      errorType: ErrorType.FATAL,
      message: "Client authentication failed - check SPOTIFY_CLIENT_ID/SECRET",
    };
  }

  if (!response.ok) {
    throw {
      errorType: ErrorType.TRANSIENT,
      message: `Failed to refresh token: ${response.statusText}`,
    };
  }

  const data: SpotifyTokenResponse = await response.json();
  return { accessToken: data.access_token };
}

// ============================================================================
// Spotify API with Rate Limiting
// ============================================================================

async function fetchSpotifyData(
  accessToken: string,
  endpoint: string
): Promise<unknown> {
  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // Handle rate limiting
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    throw {
      errorType: ErrorType.RATE_LIMIT,
      message: `Rate limited. Retry after ${retryAfter || "unknown"} seconds`,
      retryAfter: retryAfter ? parseInt(retryAfter) : 60,
    };
  }

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Snapshot Processing with Rollback
// ============================================================================

async function processUserSnapshot(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  accessToken: string,
  timeRange: (typeof TIME_RANGES)[number]
): Promise<void> {
  // Check for existing snapshot today (idempotency)
  const today = new Date().toISOString().split("T")[0];
  const { data: existingSnapshot } = await supabase
    .from("snapshots")
    .select("id")
    .eq("user_id", userId)
    .eq("time_range", timeRange)
    .gte("created_at", `${today}T00:00:00Z`)
    .lte("created_at", `${today}T23:59:59Z`)
    .single();

  if (existingSnapshot) {
    console.log(
      `Snapshot already exists for user ${userId}, time_range ${timeRange} today - skipping`
    );
    return;
  }

  // Fetch data from Spotify
  const [artistsResponse, tracksResponse] = await Promise.all([
    fetchSpotifyData(
      accessToken,
      `/me/top/artists?time_range=${timeRange}&limit=50`
    ) as Promise<{ items: SpotifyArtist[] }>,
    fetchSpotifyData(
      accessToken,
      `/me/top/tracks?time_range=${timeRange}&limit=50`
    ) as Promise<{ items: SpotifyTrack[] }>,
  ]);

  // Create snapshot
  const { data: snapshot, error: snapshotError } = await supabase
    .from("snapshots")
    .insert({
      user_id: userId,
      time_range: timeRange,
    })
    .select()
    .single();

  if (snapshotError || !snapshot) {
    throw new Error(`Failed to create snapshot: ${snapshotError?.message}`);
  }

  const snapshotId = snapshot.id;

  try {
    // Insert artist rankings
    if (artistsResponse.items.length > 0) {
      const artistRankings = artistsResponse.items.map(
        (artist: SpotifyArtist, index: number) => ({
          snapshot_id: snapshotId,
          user_id: userId,
          artist_id: artist.id,
          artist_name: artist.name,
          artist_image_url: artist.images?.[0]?.url ?? null,
          genres: artist.genres ?? [],
          popularity: artist.popularity ?? null,
          rank: index + 1,
        })
      );

      const { error: artistError } = await supabase
        .from("artist_rankings")
        .insert(artistRankings);

      if (artistError) {
        throw new Error(`Failed to insert artist rankings: ${artistError.message}`);
      }
    }

    // Process tracks and extract albums
    const albumMap = new Map<
      string,
      {
        id: string;
        name: string;
        imageUrl: string | null;
        artistId: string;
        artistName: string;
        trackCount: number;
      }
    >();

    const trackRankings = tracksResponse.items.map(
      (track: SpotifyTrack, index: number) => {
        // Track album for album rankings
        const albumId = track.album.id;
        if (albumMap.has(albumId)) {
          albumMap.get(albumId)!.trackCount++;
        } else {
          albumMap.set(albumId, {
            id: albumId,
            name: track.album.name,
            imageUrl: track.album.images?.[0]?.url ?? null,
            artistId: track.artists[0]?.id ?? "",
            artistName: track.artists.map((a: SpotifyArtist) => a.name).join(", "),
            trackCount: 1,
          });
        }

        return {
          snapshot_id: snapshotId,
          user_id: userId,
          track_id: track.id,
          track_name: track.name,
          track_image_url: track.album.images?.[0]?.url ?? null,
          artist_id: track.artists[0]?.id ?? "",
          artist_name: track.artists.map((a: SpotifyArtist) => a.name).join(", "),
          album_id: albumId,
          album_name: track.album.name,
          duration_ms: track.duration_ms,
          popularity: track.popularity,
          rank: index + 1,
        };
      }
    );

    // Insert track rankings
    if (trackRankings.length > 0) {
      const { error: trackError } = await supabase
        .from("track_rankings")
        .insert(trackRankings);

      if (trackError) {
        throw new Error(`Failed to insert track rankings: ${trackError.message}`);
      }
    }

    // Insert album rankings
    const sortedAlbums = Array.from(albumMap.values()).sort(
      (a, b) => b.trackCount - a.trackCount
    );

    if (sortedAlbums.length > 0) {
      const albumRankings = sortedAlbums.map((album, index) => ({
        snapshot_id: snapshotId,
        user_id: userId,
        album_id: album.id,
        album_name: album.name,
        album_image_url: album.imageUrl,
        artist_id: album.artistId,
        artist_name: album.artistName,
        track_count: album.trackCount,
        rank: index + 1,
      }));

      const { error: albumError } = await supabase
        .from("album_rankings")
        .insert(albumRankings);

      if (albumError) {
        throw new Error(`Failed to insert album rankings: ${albumError.message}`);
      }
    }

    console.log(
      `Successfully created snapshot for user ${userId}, time_range ${timeRange}`
    );
  } catch (error) {
    // Rollback: Delete the snapshot on any failure
    console.error(
      `Error processing snapshot ${snapshotId}, rolling back...`,
      error
    );
    const { error: rollbackError } = await supabase
      .from("snapshots")
      .delete()
      .eq("id", snapshotId);

    if (rollbackError) {
      console.warn(
        `Failed to roll back snapshot ${snapshotId}. Snapshot may remain in the database.`,
        rollbackError
      );
    }
    throw error;
  }
}

// ============================================================================
// Process Single User - All Time Ranges
// ============================================================================

async function processUser(
  supabase: ReturnType<typeof createClient>,
  connection: SpotifyConnection
): Promise<{ success: boolean; errorType?: ErrorType; error?: string }> {
  try {
    // Refresh access token
    const { accessToken } = await refreshSpotifyToken(connection.refresh_token);

    // Process all time ranges
    for (const timeRange of TIME_RANGES) {
      try {
        await processUserSnapshot(
          supabase,
          connection.user_id,
          accessToken,
          timeRange
        );
      } catch (error) {
        // If one time range fails, log but continue with others
        console.error(
          `Failed to process ${timeRange} for user ${connection.user_id}:`,
          error
        );
        // Re-throw rate limit errors to handle at user level
        if ((error as { errorType?: string }).errorType === ErrorType.RATE_LIMIT) {
          throw error;
        }
      }
    }

    // Update connection status on success
    await supabase
      .from("spotify_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        last_error: null,
        status: "connected",
      })
      .eq("user_id", connection.user_id);

    return { success: true };
  } catch (error) {
    const errorObj = error as { errorType?: ErrorType; message?: string };
    const errorType = errorObj.errorType || ErrorType.TRANSIENT;
    const errorMessage =
      errorObj.message || (error instanceof Error ? error.message : "Unknown error");

    // Update connection based on error type
    if (errorType === ErrorType.REVOKED) {
      await supabase
        .from("spotify_connections")
        .update({
          status: "revoked",
          last_error: errorMessage,
        })
        .eq("user_id", connection.user_id);
    } else {
      await supabase
        .from("spotify_connections")
        .update({
          status: errorType === ErrorType.FATAL ? "error" : "connected",
          last_error: errorMessage,
        })
        .eq("user_id", connection.user_id);
    }

    return { success: false, errorType, error: errorMessage };
  }
}

// ============================================================================
// Concurrent Processing with Limits
// ============================================================================

async function processUsersInBatches(
  supabase: ReturnType<typeof createClient>,
  connections: SpotifyConnection[]
): Promise<ProcessingResult> {
  const results: ProcessingResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    revoked: 0,
    errors: [],
  };

  // Process users in batches to limit concurrency
  for (let i = 0; i < connections.length; i += MAX_CONCURRENT_USERS) {
    const batch = connections.slice(i, i + MAX_CONCURRENT_USERS);

    const batchResults = await Promise.all(
      batch.map((connection) => processUser(supabase, connection))
    );

    // Aggregate results
    batchResults.forEach((result, index) => {
      const connection = batch[index];
      results.processed++;

      if (result.success) {
        results.succeeded++;
      } else {
        results.failed++;
        if (result.errorType === ErrorType.REVOKED) {
          results.revoked++;
        }
        results.errors.push({
          user_id: connection.user_id,
          error: result.error || "Unknown error",
          type: result.errorType || ErrorType.TRANSIENT,
        });
      }
    });

    // Add delay between batches to avoid rate limiting
    if (i + MAX_CONCURRENT_USERS < connections.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Query spotify_connections for active users
    const { data: connections, error: connectionsError } = await supabase
      .from("spotify_connections")
      .select("user_id, refresh_token, status")
      .eq("status", "connected");

    if (connectionsError) {
      throw new Error(`Failed to query connections: ${connectionsError.message}`);
    }

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No active Spotify connections found",
          processed: 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing ${connections.length} active connections...`);

    // Process users in batches with concurrency control
    const results = await processUsersInBatches(supabase, connections);

    console.log("Processing complete:", results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
