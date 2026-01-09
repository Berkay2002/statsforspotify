import { getTopGenres } from "@/lib/spotify/api";
import { fetchArtistsByTimeRange, fetchTracksByTimeRange } from "@/lib/spotify/helpers";
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
    // Use helper functions that include previous_rank for rank change tracking
    const [artistsByTimeRange, tracksByTimeRange] = await Promise.all([
      fetchArtistsByTimeRange(50), // Fetch 50 for accurate genre extraction
      fetchTracksByTimeRange(50), // Fetch more tracks to show top 5 properly
    ]);

    // Extract genres from already-fetched artists (no additional API calls)
    const [shortTermGenres, mediumTermGenres, longTermGenres] = await Promise.all([
      getTopGenres("short_term", 5, artistsByTimeRange.short_term),
      getTopGenres("medium_term", 5, artistsByTimeRange.medium_term),
      getTopGenres("long_term", 5, artistsByTimeRange.long_term),
    ]);

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

    // Store data for rendering outside try/catch (top 5 for overview display)
    dataByTimeRange = {
      short_term: {
        artists: artistsByTimeRange.short_term.slice(0, 5),
        tracks: tracksByTimeRange.short_term.slice(0, 5),
        genres: shortTermGenres,
      },
      medium_term: {
        artists: artistsByTimeRange.medium_term.slice(0, 5),
        tracks: tracksByTimeRange.medium_term.slice(0, 5),
        genres: mediumTermGenres,
      },
      long_term: {
        artists: artistsByTimeRange.long_term.slice(0, 5),
        tracks: tracksByTimeRange.long_term.slice(0, 5),
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
