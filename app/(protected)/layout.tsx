import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentUser, SpotifyAPIError } from "@/lib/spotify/api";
import { ErrorBoundary } from "@/components/error-boundary";
import { MobileNavigation } from "@/components/mobile-navigation";
import { FloatingPlayer } from "@/components/ui/floating-player";
import { InstallPrompt } from "@/components/install-prompt";

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
        <SidebarProvider className="overflow-hidden">
          <AppSidebar user={userInfo} />
          <SidebarInset className="h-screen overflow-hidden">
            <main className="h-full overflow-y-auto">
              {/* Mobile navigation with expandable tabs - visible only on mobile */}
              <MobileNavigation className="md:hidden" />
              <div className="p-4 md:p-6">{children}</div>
            </main>
          </SidebarInset>
          <InstallPrompt />
          <FloatingPlayer />
        </SidebarProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
