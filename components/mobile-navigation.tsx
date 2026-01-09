"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Music, Music2, UserPlus } from "lucide-react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import type { LucideIcon } from "lucide-react";

interface NavigationTab {
  title: string;
  icon: LucideIcon;
  href: string;
}

const navigationTabs: NavigationTab[] = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Artists",
    icon: Users,
    href: "/dashboard/artists",
  },
  {
    title: "Tracks",
    icon: Music,
    href: "/dashboard/tracks",
  },
  {
    title: "Genres",
    icon: Music2,
    href: "/dashboard/genres",
  },
  {
    title: "Friends",
    icon: UserPlus,
    href: "/dashboard/friends",
  },
];

export function MobileNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  const handleTabChange = (index: number | null) => {
    if (index !== null) {
      const selectedTab = navigationTabs[index];
      router.push(selectedTab.href);
    }
  };

  // Map navigation tabs to expandable tabs format
  const tabs = navigationTabs.map((tab) => ({
    title: tab.title,
    icon: tab.icon,
  }));

  return (
    <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container px-4 py-3">
        <ExpandableTabs 
          tabs={tabs} 
          onChange={handleTabChange}
          activeColor="text-[#1ed760]"
          className="w-full justify-center"
        />
      </div>
    </div>
  );
}
