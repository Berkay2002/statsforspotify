import { fetchAlbumsByTimeRange, fetchArtistsByTimeRange, fetchTracksByTimeRange } from "@/lib/spotify/helpers";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/login-dialog";
import { SpotifyAttribution } from "@/components/spotify-stats-logo";
import { AutoSnapshotTrigger } from "@/components/auto-snapshot-trigger";
import { DashboardOverview } from "@/components/dashboard-overview";
import { ThreeVersions, type ThreeVersionsRecap } from "@/components/recaps/three-versions";
import { PlotTwists, type PlotTwistsRecap } from "@/components/recaps/plot-twists";
import { AlbumTakeover, type AlbumTakeoverRecap } from "@/components/recaps/album-takeover";
import { HallOfFame, type HallOfFameRecap } from "@/components/recaps/hall-of-fame";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  let overviewError: string | null = null;
  let lastSnapshotDate: string | null = null;
  let dataByTimeRange = null;
  let hasSnapshots = false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [
    { data: lastSnapshot },
    threeVersionsResult,
    plotTwistsResult,
    albumTakeoverResult,
    hallOfFameResult,
  ] = await Promise.all([
    supabase
      .from("snapshots")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.rpc(
      "get_three_versions_of_you",
      { p_target_user_id: user.id, p_limit: 10 }
    ),
    supabase.rpc(
      "get_plot_twists_recap",
      { p_target_user_id: user.id, p_days: 30, p_limit: 20 }
    ),
    supabase.rpc(
      "get_album_takeover_recap",
      { p_target_user_id: user.id, p_days: 90 }
    ),
    supabase.rpc(
      "get_hall_of_fame_recap",
      { p_target_user_id: user.id, p_days: 365, p_limit: 10 }
    ),
  ]);

  if (lastSnapshot?.created_at) {
    lastSnapshotDate = lastSnapshot.created_at;
    hasSnapshots = true;
  }

  try {
    // Use helper functions that include previous_rank for rank change tracking
    const [artistsByTimeRange, tracksByTimeRange, albumsByTimeRange] = await Promise.all([
      fetchArtistsByTimeRange(50),
      fetchTracksByTimeRange(50),
      fetchAlbumsByTimeRange(50), // Fetch albums instead of genres
    ]);

    // Store data for rendering outside try/catch (top 5 for overview display)
    dataByTimeRange = {
      short_term: {
        artists: artistsByTimeRange.short_term.slice(0, 5),
        tracks: tracksByTimeRange.short_term.slice(0, 5),
        albums: albumsByTimeRange.short_term.slice(0, 5),
      },
      medium_term: {
        artists: artistsByTimeRange.medium_term.slice(0, 5),
        tracks: tracksByTimeRange.medium_term.slice(0, 5),
        albums: albumsByTimeRange.medium_term.slice(0, 5),
      },
      long_term: {
        artists: artistsByTimeRange.long_term.slice(0, 5),
        tracks: tracksByTimeRange.long_term.slice(0, 5),
        albums: albumsByTimeRange.long_term.slice(0, 5),
      },
    };
  } catch (e) {
    overviewError = e instanceof Error ? e.message : "Failed to load Overview";
  }

  const threeVersionsRecap = (threeVersionsResult.data ?? null) as ThreeVersionsRecap | null;
  const plotTwistsRecap = (plotTwistsResult.data ?? null) as PlotTwistsRecap | null;
  const albumTakeoverRecap = (albumTakeoverResult.data ?? null) as AlbumTakeoverRecap | null;
  const hallOfFameRecap = (hallOfFameResult.data ?? null) as HallOfFameRecap | null;

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

        {overviewError || !dataByTimeRange ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <p className="text-muted-foreground">{overviewError ?? "Failed to load Overview"}</p>
            <LoginDialog>
              <Button>Re-authenticate with Spotify</Button>
            </LoginDialog>
          </div>
        ) : (
          <DashboardOverview dataByTimeRange={dataByTimeRange} />
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Fun Recaps</h2>
          <ThreeVersions recap={threeVersionsRecap} hasSnapshots={hasSnapshots} />
          <AlbumTakeover recap={albumTakeoverRecap} hasSnapshots={hasSnapshots} />
          <HallOfFame recap={hallOfFameRecap} hasSnapshots={hasSnapshots} />
          <PlotTwists recap={plotTwistsRecap} hasSnapshots={hasSnapshots} />
        </div>
      </div>
    </>
  );
}
