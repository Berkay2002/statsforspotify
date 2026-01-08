import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentUser } from "@/lib/spotify/api";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const userInfo = {
    name: spotifyProfile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || "User",
    email: user.email || "",
    avatarUrl: spotifyProfile?.images?.[0]?.url,
  };

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={userInfo} />
        <SidebarInset>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
