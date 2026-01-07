// Supabase Edge Function for collecting snapshots via cron job
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

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

async function refreshSpotifyToken(refreshToken: string): Promise<string> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(
        `${Deno.env.get("SPOTIFY_CLIENT_ID")}:${Deno.env.get("SPOTIFY_CLIENT_SECRET")}`
      )}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`);
  }

  const data: SpotifyTokenResponse = await response.json();
  return data.access_token;
}

async function fetchSpotifyData(accessToken: string, endpoint: string) {
  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.statusText}`);
  }

  return response.json();
}

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

    // Get all users with Spotify provider
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw new Error(`Failed to list users: ${usersError.message}`);
    }

    const spotifyUsers = users.users.filter(
      (user) => user.app_metadata?.provider === "spotify"
    );

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const user of spotifyUsers) {
      results.processed++;

      try {
        // Get user's refresh token from identities
        const spotifyIdentity = user.identities?.find(
          (i) => i.provider === "spotify"
        );
        
        if (!spotifyIdentity?.identity_data?.provider_refresh_token) {
          results.errors.push(`User ${user.id}: No refresh token`);
          results.failed++;
          continue;
        }

        // Refresh the access token
        const accessToken = await refreshSpotifyToken(
          spotifyIdentity.identity_data.provider_refresh_token
        );

        // Fetch top items for medium_term
        const [artistsResponse, tracksResponse] = await Promise.all([
          fetchSpotifyData(accessToken, "/me/top/artists?time_range=medium_term&limit=50"),
          fetchSpotifyData(accessToken, "/me/top/tracks?time_range=medium_term&limit=50"),
        ]);

        // Create snapshot
        const { data: snapshot, error: snapshotError } = await supabase
          .from("snapshots")
          .insert({
            user_id: user.id,
            time_range: "medium_term",
          })
          .select()
          .single();

        if (snapshotError || !snapshot) {
          throw new Error(`Failed to create snapshot: ${snapshotError?.message}`);
        }

        // Insert artist rankings
        const artistRankings = artistsResponse.items.map((artist: any, index: number) => ({
          snapshot_id: snapshot.id,
          user_id: user.id,
          artist_id: artist.id,
          artist_name: artist.name,
          artist_image_url: artist.images?.[0]?.url ?? null,
          genres: artist.genres ?? [],
          popularity: artist.popularity,
          rank: index + 1,
        }));

        await supabase.from("artist_rankings").insert(artistRankings);

        // Insert track rankings and extract albums
        const albumMap = new Map<string, any>();
        const trackRankings = tracksResponse.items.map((track: any, index: number) => {
          // Track album for album rankings
          const albumId = track.album.id;
          if (albumMap.has(albumId)) {
            albumMap.get(albumId).trackCount++;
          } else {
            albumMap.set(albumId, {
              id: albumId,
              name: track.album.name,
              imageUrl: track.album.images?.[0]?.url ?? null,
              artistId: track.artists[0]?.id ?? "",
              artistName: track.artists.map((a: any) => a.name).join(", "),
              trackCount: 1,
            });
          }

          return {
            snapshot_id: snapshot.id,
            user_id: user.id,
            track_id: track.id,
            track_name: track.name,
            track_image_url: track.album.images?.[0]?.url ?? null,
            artist_id: track.artists[0]?.id ?? "",
            artist_name: track.artists.map((a: any) => a.name).join(", "),
            album_id: albumId,
            album_name: track.album.name,
            duration_ms: track.duration_ms,
            popularity: track.popularity,
            rank: index + 1,
          };
        });

        await supabase.from("track_rankings").insert(trackRankings);

        // Insert album rankings
        const sortedAlbums = Array.from(albumMap.values())
          .sort((a, b) => b.trackCount - a.trackCount);

        const albumRankings = sortedAlbums.map((album, index) => ({
          snapshot_id: snapshot.id,
          user_id: user.id,
          album_id: album.id,
          album_name: album.name,
          album_image_url: album.imageUrl,
          artist_id: album.artistId,
          artist_name: album.artistName,
          track_count: album.trackCount,
          rank: index + 1,
        }));

        await supabase.from("album_rankings").insert(albumRankings);

        results.succeeded++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `User ${user.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

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
