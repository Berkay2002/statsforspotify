import { getTopArtists, getTopTracks, getTopGenres } from "@/lib/spotify/api";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/login-dialog";
import { SpotifyAttribution } from "@/components/spotify-stats-logo";
import { AutoSnapshotTrigger } from "@/components/auto-snapshot-trigger";
import { DashboardOverview } from "@/components/dashboard-overview";

export default async function DashboardPage() {
  let error: string | null = null;
  let lastSnapshotDate: string | null = null;
  let dataByTimeRange = null;

  try {
    // Optimized: Fetch artists and tracks first, then derive genres from artists
    // This reduces API calls from 9 to 6 (33% reduction)
    const [
      shortTermArtists,
      mediumTermArtists,
      longTermArtists,
      shortTermTracks,
      mediumTermTracks,
      longTermTracks,
    ] = await Promise.all([
      getTopArtists("short_term", 50), // Fetch 50 for accurate genre extraction
      getTopArtists("medium_term", 50),
      getTopArtists("long_term", 50),
      getTopTracks("short_term", 5),
      getTopTracks("medium_term", 5),
      getTopTracks("long_term", 5),
    ]);

    // Extract genres from already-fetched artists (no additional API calls)
    const [shortTermGenres, mediumTermGenres, longTermGenres] = await Promise.all([
      getTopGenres("short_term", 5, shortTermArtists),
      getTopGenres("medium_term", 5, mediumTermArtists),
      getTopGenres("long_term", 5, longTermArtists),
    ]);

    // Only show top 5 artists for the overview
    const topShortTermArtists = shortTermArtists.slice(0, 5);
    const topMediumTermArtists = mediumTermArtists.slice(0, 5);
    const topLongTermArtists = longTermArtists.slice(0, 5);

    // Get last snapshot date
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: lastSnapshot } = await supabase
        .from("snapshots")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (lastSnapshot) {
        lastSnapshotDate = lastSnapshot.created_at;
      }
    }

    // Store data for rendering outside try/catch
    dataByTimeRange = {
      short_term: {
        artists: topShortTermArtists,
        tracks: shortTermTracks,
        genres: shortTermGenres,
      },
      medium_term: {
        artists: topMediumTermArtists,
        tracks: mediumTermTracks,
        genres: mediumTermGenres,
      },
      long_term: {
        artists: topLongTermArtists,
        tracks: longTermTracks,
        genres: longTermGenres,
      },
    };
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load data";
  }

  // Render outside try/catch
  if (error || !dataByTimeRange) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
            <p className="text-muted-foreground">
              Your top music on Spotify
            </p>
          </div>
          <SpotifyAttribution />
        </div>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-muted-foreground">{error}</p>
          <LoginDialog>
            <Button>Re-authenticate with Spotify</Button>
          </LoginDialog>
        </div>
      </div>
    );
  }

  return (
    <>
      <AutoSnapshotTrigger />
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
            <p className="text-muted-foreground">
              Your top music on Spotify
            </p>
            {lastSnapshotDate && (
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {new Date(lastSnapshotDate).toLocaleDateString()}
              </p>
            )}
          </div>
          <SpotifyAttribution />
        </div>

        <DashboardOverview dataByTimeRange={dataByTimeRange} />
      </div>
    </>
  );
}
