"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TimeRange } from "@/lib/spotify/types";
import type { ReactNode } from "react";

interface TimeRangeTabsProps {
  value: TimeRange;
  onValueChange: (value: TimeRange) => void;
  className?: string;
  children: ReactNode;
}

export function TimeRangeTabs({ value, onValueChange, className, children }: TimeRangeTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as TimeRange)} className={className}>
      <TabsList>
        <TabsTrigger value="short_term">
          Last 4 Weeks
        </TabsTrigger>
        <TabsTrigger value="medium_term">
          Last 6 Months
        </TabsTrigger>
        <TabsTrigger value="long_term">
          All Time
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
}
