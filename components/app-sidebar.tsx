"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Disc3, LayoutDashboard, Music, Music2, UserPlus, Users } from "lucide-react";
import { SpotifyBrand } from "@/components/spotify-stats-logo";
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
    id: "albums",
    title: "Albums",
    icon: <Disc3 className="size-4" />,
    href: "/dashboard/albums",
  },
  {
    id: "genres",
    title: "Genres",
    icon: <Music2 className="size-4" />,
    href: "/dashboard/genres",
  },
  {
    id: "friends",
    title: "Friends",
    icon: <UserPlus className="size-4" />,
    href: "/dashboard/friends",
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
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader
        className={cn(
          "flex",
          isCollapsed
            ? "flex-col items-start justify-start pt-2"
            : "flex-row items-center justify-between md:pt-3.5 px-2"
        )}
      >
        {!isCollapsed && (
          <a href="/dashboard" className="flex items-center flex-1 min-w-0 ml-2">
            <SpotifyBrand className="h-8 w-auto text-[#1ed760]" />
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
        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
