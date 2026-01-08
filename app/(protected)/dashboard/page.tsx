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

  try {
    // Fetch all three time ranges in parallel for each category
    const [
      shortTermArtists,
      mediumTermArtists,
      longTermArtists,
      shortTermTracks,
      mediumTermTracks,
      longTermTracks,
      shortTermGenres,
      mediumTermGenres,
      longTermGenres,
    ] = await Promise.all([
      getTopArtists("short_term", 5),
      getTopArtists("medium_term", 5),
      getTopArtists("long_term", 5),
      getTopTracks("short_term", 5),
      getTopTracks("medium_term", 5),
      getTopTracks("long_term", 5),
      getTopGenres("short_term", 5),
      getTopGenres("medium_term", 5),
      getTopGenres("long_term", 5),
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

          <DashboardOverview
            dataByTimeRange={{
              short_term: {
                artists: shortTermArtists,
                tracks: shortTermTracks,
                genres: shortTermGenres,
              },
              medium_term: {
                artists: mediumTermArtists,
                tracks: mediumTermTracks,
                genres: mediumTermGenres,
              },
              long_term: {
                artists: longTermArtists,
                tracks: longTermTracks,
                genres: longTermGenres,
              },
            }}
          />
        </div>
      </>
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load data";
  }

  if (error) {
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
}
