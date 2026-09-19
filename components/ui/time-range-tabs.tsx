"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StickyBar } from "@/components/ui/sticky-bar";
import type { TimeRange } from "@/lib/spotify/types";
import type { ReactNode } from "react";

const ranges: { value: TimeRange; label: string; short: string }[] = [
  { value: "short_term", label: "Last 4 Weeks", short: "4 Weeks" },
  { value: "medium_term", label: "Last 6 Months", short: "6 Months" },
  { value: "long_term", label: "All Time", short: "All" },
];

/** The three time-range triggers as a glass pill, compact on phones. Must sit inside a <Tabs>. */
export function TimeRangeTabsList({ className }: { className?: string }) {
  return (
    <TabsList className={className ? `glass ${className}` : "glass"}>
      {ranges.map((r) => (
        <TabsTrigger key={r.value} value={r.value}>
          <span className="md:hidden">{r.short}</span>
          <span className="hidden md:inline">{r.label}</span>
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

interface TimeRangeTabsProps {
  value: TimeRange;
  onValueChange: (value: TimeRange) => void;
  className?: string;
  /** Page title block shown at the left of the bar. */
  leading?: ReactNode;
  rightContent?: ReactNode;
  /** Float the bar at the top of the scroller. Off when a parent already provides a sticky bar. */
  sticky?: boolean;
  children: ReactNode;
}

export function TimeRangeTabs({
  value,
  onValueChange,
  className,
  leading,
  rightContent,
  sticky = true,
  children,
}: TimeRangeTabsProps) {
  // Toolbar order: secondary control first, the range picker anchored at the far right.
  const row = (
    <>
      {rightContent ? <div className="shrink-0">{rightContent}</div> : null}
      <TimeRangeTabsList />
    </>
  );
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as TimeRange)} className={className}>
      {sticky ? (
        <StickyBar leading={leading}>{row}</StickyBar>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-3">{row}</div>
      )}
      {children}
    </Tabs>
  );
}
