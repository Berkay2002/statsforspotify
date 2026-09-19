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
  renderItems: (items: T[], sparklinesByItemId: SparklinesByItemId, isLoading: boolean, timeRange: TimeRange) => ReactNode;
  userId?: string;
  /** An external range replaces the list's own time-range controls. */
  timeRange?: TimeRange;
  className?: string;
  /** Page title block for the sticky top bar. */
  leading?: ReactNode;
  tabsRightContent?: ReactNode;
}

/**
 * Generic component for rendering lists with time range tabs and sparklines
 * Encapsulates common pattern used across Artists, Tracks, and Albums lists
 */
export function TimeRangeList<T extends ItemWithId>({
  itemsByTimeRange,
  itemType,
  userId,
  renderItems,
  className,
  leading,
  tabsRightContent,
  timeRange: externalTimeRange,
}: TimeRangeListProps<T>) {
  const [localTimeRange, setTimeRange] = useState<TimeRange>("short_term");
  const timeRange = externalTimeRange ?? localTimeRange;
  const items = itemsByTimeRange[timeRange];
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  return (
    <SparklineLoader key={`${userId ?? "me"}:${timeRange}`} itemIds={itemIds} itemType={itemType} userId={userId}>
      {(sparklinesByItemId, isLoading) => externalTimeRange ? (
        <div className={className}>
          {leading}
          {tabsRightContent && <div className="mb-4 flex justify-end">{tabsRightContent}</div>}
          {renderItems(items, sparklinesByItemId, isLoading, timeRange)}
        </div>
      ) : (
        <TimeRangeTabs
          value={timeRange}
          onValueChange={setTimeRange}
          className={className}
          leading={leading}
          rightContent={tabsRightContent}
        >
          <TabsContent value={timeRange} className="mt-6">
            {renderItems(items, sparklinesByItemId, isLoading, timeRange)}
          </TabsContent>
        </TimeRangeTabs>
      )}
    </SparklineLoader>
  );
}
