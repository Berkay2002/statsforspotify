import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Download, 
  LogOut, 
  AlertTriangle,
  Database
} from "lucide-react";
import { DeleteDataDialog } from "./delete-data-dialog";
import { ExportDataButton } from "./export-data-button";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  const userInfo = {
    name: user.user_metadata?.full_name || user.user_metadata?.name || "User",
    email: user.email || "",
    avatarUrl: user.user_metadata?.avatar_url,
    createdAt: user.created_at,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile & Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and data
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userInfo.avatarUrl} alt={userInfo.name} />
              <AvatarFallback className="text-lg">
                {userInfo.name?.charAt(0)?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xl font-semibold">{userInfo.name}</p>
              <p className="text-sm text-muted-foreground">{userInfo.email}</p>
              <Badge variant="secondary" className="mt-2">
                Connected via Spotify
              </Badge>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="text-sm text-muted-foreground">
            <p>Account created: {new Date(userInfo.createdAt).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Data Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Your Data
          </CardTitle>
          <CardDescription>
            Statistics about your stored data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{snapshotCount || 0}</p>
              <p className="text-sm text-muted-foreground">Snapshots</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-sm font-medium">
                {firstSnapshot 
                  ? new Date(firstSnapshot.created_at).toLocaleDateString()
                  : "—"}
              </p>
              <p className="text-sm text-muted-foreground">First Snapshot</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-sm font-medium">
                {lastSnapshot 
                  ? new Date(lastSnapshot.created_at).toLocaleDateString()
                  : "—"}
              </p>
              <p className="text-sm text-muted-foreground">Last Snapshot</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>
            Download all your data in JSON or CSV format
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <ExportDataButton format="json" />
          <ExportDataButton format="csv" />
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
