"use client";

import { useRouter } from "next/navigation";
import { Disc3, LayoutDashboard, Mic2, Music, UserPlus, Waves } from "lucide-react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationTab {
  title: string;
  icon: LucideIcon;
  href: string;
}

interface MobileNavigationProps {
  className?: string;
}

const navigationTabs: NavigationTab[] = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Artists",
    icon: Mic2,
    href: "/dashboard/artists",
  },
  {
    title: "Tracks",
    icon: Music,
    href: "/dashboard/tracks",
  },
  {
    title: "Albums",
    icon: Disc3,
    href: "/dashboard/albums",
  },
  {
    title: "Genres",
    icon: Waves,
    href: "/dashboard/genres",
  },
  {
    title: "Friends",
    icon: UserPlus,
    href: "/dashboard/friends",
  },
];

export function MobileNavigation({ className }: MobileNavigationProps = {}) {
  const router = useRouter();

  const handleTabChange = (index: number | null) => {
    if (index !== null) {
      const selectedTab = navigationTabs[index];
      router.push(selectedTab.href);
    }
  };

  const tabs = navigationTabs.map((tab) => ({
    title: tab.title,
    icon: tab.icon,
  }));

  return (
    <div className={cn("sticky top-0 z-20 bg-linear-to-b from-background via-background/95 to-background/0 backdrop-blur supports-backdrop-filter:bg-background/60", className)}>
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
