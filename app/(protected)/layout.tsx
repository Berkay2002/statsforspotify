import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentUser, SpotifyAPIError } from "@/lib/spotify/api";
import { ErrorBoundary } from "@/components/error-boundary";

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

  // Fetch Spotify profile with avatar and handle auth errors
  let spotifyProfile;
  
  try {
    spotifyProfile = await getCurrentUser();
  } catch (error) {
    console.error("[Protected Layout] Failed to fetch Spotify profile:", error);
    
    // If Spotify auth is required, redirect to home page to re-authenticate
    if (error instanceof SpotifyAPIError && error.shouldRefresh) {
      redirect("/?reauth=spotify");
    }
    
    // For other errors, we'll still try to render the layout
    // but without Spotify profile data
  }

  const userInfo = {
    name: spotifyProfile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || "User",
    email: user.email || "",
    avatarUrl: spotifyProfile?.images?.[0]?.url,
  };

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar user={userInfo} />
          <SidebarInset>
            <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-4 py-3 md:hidden">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">Menu</h1>
            </header>
            <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
