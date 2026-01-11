"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TimeRange } from "@/lib/spotify/types";

interface TimeRangeQueryTabsProps {
  value: TimeRange;
  className?: string;
  queryParameterName?: string;
  defaultValue?: TimeRange;
}

export function TimeRangeQueryTabs({
  value,
  className,
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
    <Tabs
      value={value}
      onValueChange={(nextValue) => handleValueChange(nextValue as TimeRange)}
      className={className}
    >
      <TabsList>
        <TabsTrigger value="short_term">Past 4 weeks</TabsTrigger>
        <TabsTrigger value="medium_term">Past 6 months</TabsTrigger>
        <TabsTrigger value="long_term">All time</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

