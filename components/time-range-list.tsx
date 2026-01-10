"use client";

import { ReactNode, useMemo, useState } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { TimeRangeTabs } from "@/components/ui/time-range-tabs";
import { SparklineLoader } from "@/components/charts/sparkline-loader";
import type { TimeRange } from "@/lib/spotify/types";

interface ItemWithId {
  id: string;
}

interface TimeRangeData<T extends ItemWithId> {
  short_term: T[];
  medium_term: T[];
  long_term: T[];
}

interface TimeRangeListProps<T extends ItemWithId> {
  itemsByTimeRange: TimeRangeData<T>;
  itemType: "artist" | "track" | "album";
  renderItems: (items: T[], sparklines: Record<string, { date: string; rank: number }[]>, loading: boolean) => ReactNode;
  className?: string;
}

/**
 * Generic component for rendering lists with time range tabs and sparklines
 * Encapsulates common pattern used across Artists, Tracks, and Albums lists
 */
export function TimeRangeList<T extends ItemWithId>({
  itemsByTimeRange,
  itemType,
  renderItems,
  className,
}: TimeRangeListProps<T>) {
  const [timeRange, setTimeRange] = useState<TimeRange>("short_term");
  const items = itemsByTimeRange[timeRange];
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  return (
    <SparklineLoader itemIds={itemIds} type={itemType}>
      {(sparklines, loading) => (
        <TimeRangeTabs value={timeRange} onValueChange={setTimeRange} className={className}>
          <TabsContent value={timeRange} className="mt-6">
            {renderItems(items, sparklines, loading)}
          </TabsContent>
        </TimeRangeTabs>
      )}
    </SparklineLoader>
  );
}
