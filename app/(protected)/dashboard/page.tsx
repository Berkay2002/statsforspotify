import { fetchAlbumsByTimeRange, fetchArtistsByTimeRange, fetchTracksByTimeRange } from "@/lib/spotify/helpers";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/login-dialog";
import { PageTitle } from "@/components/ui/page-title";
import { AutoSnapshotTrigger } from "@/components/auto-snapshot-trigger";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { type ThreeVersionsRecap } from "@/components/recaps/three-versions";
import { type PlotTwistsRecap } from "@/components/recaps/plot-twists";
import { type HallOfFameRecap } from "@/components/recaps/hall-of-fame";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  let overviewError: string | null = null;
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
    hallOfFameResult,
  ] = await Promise.all([
    supabase
      .from("snapshots")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.rpc("get_three_versions_of_you", {
      p_target_user_id: user.id,
      p_limit: 10,
    }),
    supabase.rpc("get_plot_twists_recap", {
      p_target_user_id: user.id,
      p_days: 30,
      p_limit: 20,
    }),
    supabase.rpc("get_hall_of_fame_recap", {
      p_target_user_id: user.id,
      p_days: 365,
      p_limit: 10,
    }),
  ]);

  if (lastSnapshot?.created_at) {
    hasSnapshots = true;
  }

  let artists, tracks, albums;
  try {
    [artists, tracks, albums] = await Promise.all([
      fetchArtistsByTimeRange(50),
      fetchTracksByTimeRange(50),
      fetchAlbumsByTimeRange(50),
    ]);
  } catch (e) {
    overviewError = e instanceof Error ? e.message : "Failed to load Overview";
  }

  const threeVersionsRecap = (threeVersionsResult.data ?? null) as ThreeVersionsRecap | null;
  const plotTwistsRecap = (plotTwistsResult.data ?? null) as PlotTwistsRecap | null;
  const hallOfFameRecap = (hallOfFameResult.data ?? null) as HallOfFameRecap | null;

  const overviewTitle = <PageTitle title="Overview" description="Your top music on Spotify" />;

  return (
    <>
      <AutoSnapshotTrigger />
      <div className="space-y-6">
        {overviewError || !artists || !tracks || !albums ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            {overviewTitle}
            <p className="text-muted-foreground">
              {overviewError ?? "Failed to load Overview"}
            </p>
            <LoginDialog>
              <Button>Re-authenticate with Spotify</Button>
            </LoginDialog>
          </div>
        ) : (
          <DashboardContent
            leading={overviewTitle}
            artists={artists}
            tracks={tracks}
            albums={albums}
            threeVersions={threeVersionsRecap}
            plotTwists={plotTwistsRecap}
            hallOfFame={hallOfFameRecap}
            hasSnapshots={hasSnapshots}
          />
        )}
      </div>
    </>
  );
}
