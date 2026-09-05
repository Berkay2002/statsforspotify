"use client";

import { ReactNode, useMemo, useState } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { TimeRangeTabs } from "@/components/ui/time-range-tabs";
import { SparklineLoader } from "@/components/charts/sparkline-loader";
import type { SparklinesByItemId } from "@/components/charts/sparkline-cache";
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
  renderItems: (items: T[], sparklinesByItemId: SparklinesByItemId, isLoading: boolean) => ReactNode;
  className?: string;
  userId?: string;
  tabsRightContent?: ReactNode;
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
  userId,
  tabsRightContent,
}: TimeRangeListProps<T>) {
  const [timeRange, setTimeRange] = useState<TimeRange>("short_term");
  const items = itemsByTimeRange[timeRange];
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  return (
    <SparklineLoader itemIds={itemIds} itemType={itemType} timeRange={timeRange} userId={userId}>
      {(sparklinesByItemId, isLoading) => (
        <TimeRangeTabs
          value={timeRange}
          onValueChange={setTimeRange}
          className={className}
          rightContent={tabsRightContent}
        >
          <TabsContent value={timeRange} className="mt-6">
            {renderItems(items, sparklinesByItemId, isLoading)}
          </TabsContent>
        </TimeRangeTabs>
      )}
    </SparklineLoader>
  );
}
