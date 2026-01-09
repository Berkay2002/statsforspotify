"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Mic2, Music, Waves, UserPlus, Settings, Moon, Sun } from "lucide-react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

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
    title: "Genres",
    icon: Waves,
    href: "/dashboard/genres",
  },
  {
    title: "Friends",
    icon: UserPlus,
    href: "/dashboard/friends",
  },
  {
    title: "Profile",
    icon: Settings,
    href: "/profile",
  },
];

export function MobileNavigation({ className }: MobileNavigationProps = {}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleTabChange = (index: number | null) => {
    if (index !== null) {
      const selectedTab = navigationTabs[index];
      
      // Handle theme toggle separately (it's the last tab)
      if (index === navigationTabs.length) {
        setTheme(theme === "dark" ? "light" : "dark");
      } else {
        router.push(selectedTab.href);
      }
    }
  };

  // Map navigation tabs to expandable tabs format, plus theme toggle
  const tabs = [
    ...navigationTabs.map((tab) => ({
      title: tab.title,
      icon: tab.icon,
    })),
    {
      title: "Theme",
      icon: theme === "dark" ? Moon : Sun,
    },
  ];

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
