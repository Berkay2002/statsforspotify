"use client";

import { useCallback, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { TimeRangeTabsList } from "@/components/ui/time-range-tabs";
import { StickyBar } from "@/components/ui/sticky-bar";
import type { TimeRange } from "@/lib/spotify/types";

interface TimeRangeQueryTabsProps {
  value: TimeRange;
  /** Control shown at the left of the toolbar, e.g. a back button. */
  leading?: ReactNode;
  queryParameterName?: string;
  defaultValue?: TimeRange;
}

export function TimeRangeQueryTabs({
  value,
  leading,
  queryParameterName = "time_range",
  defaultValue = "medium_term",
}: TimeRangeQueryTabsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParameters = useSearchParams();

  const handleValueChange = useCallback(
    (nextTimeRange: TimeRange) => {
      const nextSearchParameters = new URLSearchParams(searchParameters.toString());

      if (nextTimeRange === defaultValue) {
        nextSearchParameters.delete(queryParameterName);
      } else {
        nextSearchParameters.set(queryParameterName, nextTimeRange);
      }

      const queryString = nextSearchParameters.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [defaultValue, pathname, queryParameterName, router, searchParameters]
  );

  return (
    // "contents" so the sticky bar is constrained by the page, not by this wrapper.
    <Tabs value={value} onValueChange={(nextValue) => handleValueChange(nextValue as TimeRange)} className="contents">
      <StickyBar leading={leading} className="mx-0 mt-0 -mb-[calc(4.5rem+env(safe-area-inset-top,0px))] md:mx-0 md:mt-0 md:-mb-20">
        <TimeRangeTabsList />
      </StickyBar>
    </Tabs>
  );
}

