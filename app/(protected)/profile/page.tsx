import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  LogOut, 
  AlertTriangle,
  Database,
  Calendar,
  TrendingUp,
  Music,
  CheckCircle2,
  Eye,
  Users,
  UserPlus
} from "lucide-react";
import { DeleteDataDialog } from "./delete-data-dialog";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { ExportDataButton } from "./export-data-button";
import { PrivacySettings } from "./privacy-settings";
import { getCurrentUser } from "@/lib/spotify/api";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch Spotify profile with avatar
  let spotifyProfile;
  try {
    spotifyProfile = await getCurrentUser();
  } catch (error) {
    console.error("Failed to fetch Spotify profile:", error);
  }

  // Get user profile for username and privacy settings
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Get snapshot count
  const { count: snapshotCount } = await supabase
    .from("snapshots")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Get first and last snapshot dates
  const { data: firstSnapshot } = await supabase
    .from("snapshots")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  const { data: lastSnapshot } = await supabase
    .from("snapshots")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Get total artist, track, and album rankings
  const [
    { count: artistRankingsCount },
    { count: trackRankingsCount },
    { count: albumRankingsCount },
  ] = await Promise.all([
    supabase
      .from("artist_rankings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("track_rankings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("album_rankings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  // Get followers and following counts
  const [
    { count: followersCount },
    { count: followingCount },
  ] = await Promise.all([
    supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("friend_id", user.id)
      .eq("status", "accepted"),
    supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "accepted"),
  ]);

  // Calculate days since first snapshot
  const now = new Date();
  const daysSinceFirstSnapshot = firstSnapshot 
    ? Math.floor((now.getTime() - new Date(firstSnapshot.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const userInfo = {
    name: spotifyProfile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || "User",
    email: user.email || "",
    avatarUrl: spotifyProfile?.images?.[0]?.url,
    createdAt: user.created_at,
  };

  const totalRankings = (artistRankingsCount || 0) + (trackRankingsCount || 0) + (albumRankingsCount || 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile & Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and data
        </p>
      </div>

      {/* Profile Card */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-linear-to-r from-[#1DB954]/20 to-primary/20" />
        <CardContent className="-mt-10 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              <AvatarImage src={userInfo.avatarUrl} alt={userInfo.name} />
              <AvatarFallback className="text-2xl">
                {userInfo.name?.charAt(0)?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{userInfo.name}</h2>
                  <p className="text-sm text-muted-foreground">{userInfo.email}</p>
                </div>
                <Badge variant="secondary" className="gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#1DB954]" />
                  Connected
                </Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {new Date(userInfo.createdAt).toLocaleDateString()}</span>
                </div>
                {daysSinceFirstSnapshot > 0 && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>{daysSinceFirstSnapshot} {daysSinceFirstSnapshot === 1 ? 'day' : 'days'} tracked</span>
                  </div>
                )}
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-1.5 font-medium">
                  <Users className="h-4 w-4" />
                  <span>{followersCount || 0} {followersCount === 1 ? 'Follower' : 'Followers'}</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <UserPlus className="h-4 w-4" />
                  <span>{followingCount || 0} Following</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Database className="h-5 w-5 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">Total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{snapshotCount || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Snapshots</p>
            {snapshotCount && snapshotCount > 0 && (
              <div className="mt-3">
                <Progress value={Math.min((snapshotCount / 100) * 100, 100)} className="h-1.5" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Music className="h-5 w-5 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">Records</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalRankings.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Rankings</p>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>{artistRankingsCount || 0} artists</p>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">First</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold">
              {firstSnapshot 
                ? new Date(firstSnapshot.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : "No data yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">First Snapshot</p>
            {daysSinceFirstSnapshot > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {daysSinceFirstSnapshot} days ago
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">Latest</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-base font-semibold">
              {lastSnapshot 
                ? new Date(lastSnapshot.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : "No data yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Last Snapshot</p>
            {lastSnapshot && (
              <p className="text-xs text-muted-foreground mt-2">
                {Math.floor((now.getTime() - new Date(lastSnapshot.created_at).getTime()) / (1000 * 60 * 60 * 24))} days ago
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Privacy & Username Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Privacy & Profile Settings
          </CardTitle>
          <CardDescription>
            Control who can view your listening stats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium">Username</label>
            <div className="flex items-center gap-2">
              <Input
                value={userProfile ? `${userProfile.display_name}#${userProfile.discriminator}` : "Loading..."}
                disabled
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your username is used to identify you to friends. The discriminator (#0000) helps with uniqueness.
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <label className="text-sm font-medium">Stats Visibility</label>
            {userProfile ? (
              <PrivacySettings currentVisibility={userProfile.stats_visibility} />
            ) : (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Ranking Breakdown
          </CardTitle>
          <CardDescription>
            How your rankings are distributed across categories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#1DB954]" />
                <span className="text-sm font-medium">Artist Rankings</span>
              </div>
              <span className="text-sm font-bold">{(artistRankingsCount || 0).toLocaleString()}</span>
            </div>
            <Progress value={totalRankings ? (artistRankingsCount || 0) / totalRankings * 100 : 0} className="h-2" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-sm font-medium">Track Rankings</span>
              </div>
              <span className="text-sm font-bold">{(trackRankingsCount || 0).toLocaleString()}</span>
            </div>
            <Progress value={totalRankings ? (trackRankingsCount || 0) / totalRankings * 100 : 0} className="h-2" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                <span className="text-sm font-medium">Album Rankings</span>
              </div>
              <span className="text-sm font-bold">{(albumRankingsCount || 0).toLocaleString()}</span>
            </div>
            <Progress value={totalRankings ? (albumRankingsCount || 0) / totalRankings * 100 : 0} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Data
          </CardTitle>
          <CardDescription>
            Download all your listening history and rankings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4 space-y-2">
                <div>
                  <p className="font-medium text-sm">JSON Format</p>
                  <p className="text-xs text-muted-foreground">Machine-readable</p>
                </div>
                <ExportDataButton format="json" />
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <div>
                  <p className="font-medium text-sm">CSV Format</p>
                  <p className="text-xs text-muted-foreground">Spreadsheet-ready</p>
                </div>
                <ExportDataButton format="csv" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Exports include all snapshots, rankings, and metadata
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              These actions are irreversible. Please proceed with caution.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <h4 className="font-medium">Delete Account</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
            </div>
            <DeleteAccountDialog />
          </div>

          <Separator />

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <h4 className="font-medium">Delete All Data</h4>
              <p className="text-sm text-muted-foreground">
                Remove all your snapshots and ranking history. Your account will remain active.
              </p>
            </div>
            <DeleteDataDialog />
          </div>

          <Separator />

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <h4 className="font-medium">Disconnect Account</h4>
              <p className="text-sm text-muted-foreground">
                Sign out and revoke access. You can reconnect at any time.
              </p>
            </div>
            <form action="/auth/signout" method="POST">
              <Button type="submit" variant="outline">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
