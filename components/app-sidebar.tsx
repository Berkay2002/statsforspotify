"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, Music, Music2, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { SpotifyStatsLogo } from "@/components/spotify-stats-logo";
import { SidebarNavigation, type NavRoute } from "@/components/sidebar-navigation";
import { UserMenu } from "@/components/user-menu";

const navRoutes: NavRoute[] = [
  {
    id: "overview",
    title: "Overview",
    icon: <LayoutDashboard className="size-4" />,
    href: "/dashboard",
  },
  {
    id: "artists",
    title: "Artists",
    icon: <Users className="size-4" />,
    href: "/dashboard/artists",
  },
  {
    id: "tracks",
    title: "Tracks",
    icon: <Music className="size-4" />,
    href: "/dashboard/tracks",
  },
  {
    id: "genres",
    title: "Genres",
    icon: <Music2 className="size-4" />,
    href: "/dashboard/genres",
  },
];

interface AppSidebarProps {
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader
        className={cn(
          "flex",
          isCollapsed
            ? "flex-col items-start justify-start pt-2"
            : "flex-row items-center justify-between md:pt-3.5"
        )}
      >
        {!isCollapsed && (
          <a href="/dashboard" className="flex items-center justify-center flex-1">
            <span className="font-[family-name:var(--font-ultra)] text-base tracking-tight bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent whitespace-nowrap">
              Stats for Spotify
            </span>
          </a>
        )}

        <motion.div
          key={isCollapsed ? "header-collapsed" : "header-expanded"}
          className={cn(
            "flex items-center gap-2",
            isCollapsed ? "flex-row md:flex-col-reverse" : "flex-row"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <SidebarTrigger />
        </motion.div>
      </SidebarHeader>
      <SidebarContent className="gap-4 px-2 py-4">
        <SidebarNavigation routes={navRoutes} />
      </SidebarContent>
      <SidebarFooter className="px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              tooltip="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              {!isCollapsed && <span>Theme</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
