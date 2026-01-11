"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearSparklinesCache,
  readCachedSparklines,
  writeCachedSparklines,
  SPARKLINE_CACHE_INVALIDATION_EVENT_NAME,
  type SparklinesByItemId,
} from "@/components/charts/sparkline-cache";
import SparklineChart from "@/components/charts/sparkline-chart";

interface SparklineLoaderProps {
  itemIds: string[];
  itemType: "artist" | "track" | "album";
  children: (sparklinesByItemId: SparklinesByItemId, isLoading: boolean) => React.ReactNode;
}

export function SparklineLoader({ itemIds, itemType, children }: SparklineLoaderProps) {
  const [sparklinesByItemId, setSparklinesByItemId] = useState<SparklinesByItemId>({});
  const [isLoading, setIsLoading] = useState(true);
  const [cacheInvalidationCounter, setCacheInvalidationCounter] = useState(0);

  // Stable key to prevent unnecessary refetches when array reference changes
  // Only refetch if the actual IDs or their order changes
  const itemIdsSignature = useMemo(() => itemIds.join(","), [itemIds]);
  const sparklinesCacheKey = `${itemType}:${itemIdsSignature}`;
  
  // Track ongoing requests to prevent duplicate fetches
  const inFlightCacheKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const handleSparklinesCacheInvalidation = () => {
      clearSparklinesCache();
      inFlightCacheKeyRef.current = null;
      setCacheInvalidationCounter((previousValue) => previousValue + 1);
    };

    window.addEventListener(
      SPARKLINE_CACHE_INVALIDATION_EVENT_NAME,
      handleSparklinesCacheInvalidation,
    );
    return () =>
      window.removeEventListener(
        SPARKLINE_CACHE_INVALIDATION_EVENT_NAME,
        handleSparklinesCacheInvalidation,
      );
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const fetchSparklines = async () => {
      if (itemIds.length === 0) {
        if (!isCancelled) setIsLoading(false);
        return;
      }

      // Check cache first
      const cached = readCachedSparklines(sparklinesCacheKey);
      if (cached) {
        if (!isCancelled) {
          setSparklinesByItemId(cached);
          setIsLoading(false);
        }
        return;
      }

      // Prevent duplicate requests for the same data
      if (inFlightCacheKeyRef.current === sparklinesCacheKey) {
        return;
      }

      if (!isCancelled) {
        setIsLoading(true);
        inFlightCacheKeyRef.current = sparklinesCacheKey;
      }
      
      try {
        const response = await fetch(
          `/api/rankings/sparklines?type=${itemType}&ids=${itemIdsSignature}`,
        );
        
        if (isCancelled) return;
        
        if (!response.ok) {
          throw new Error("Failed to fetch sparklines");
        }

        const responseBody = await response.json();
        
        if (!isCancelled) {
          if (responseBody.sparklines) {
            // Cache the result
            writeCachedSparklines(sparklinesCacheKey, responseBody.sparklines);
            setSparklinesByItemId(responseBody.sparklines);
          }
          setIsLoading(false);
          inFlightCacheKeyRef.current = null;
        }
      } catch (caughtError) {
        if (!isCancelled) {
          console.error("Failed to fetch sparklines:", caughtError);
          setIsLoading(false);
          inFlightCacheKeyRef.current = null;
        }
      }
    };

    fetchSparklines();

    return () => {
      isCancelled = true;
    };
  }, [itemIds.length, itemIdsSignature, itemType, sparklinesCacheKey, cacheInvalidationCounter]); // Use stable key instead of itemIds array

  return <>{children(sparklinesByItemId, isLoading)}</>;
}

interface InlineSparklineProps {
  itemId: string;
  sparklinesByItemId: SparklinesByItemId;
  isLoading: boolean;
}

export function InlineSparkline({ itemId, sparklinesByItemId, isLoading }: InlineSparklineProps) {
  if (isLoading) {
    return null;
  }

  const sparklinePoints = sparklinesByItemId[itemId];
  if (!sparklinePoints || sparklinePoints.length < 2) {
    return null;
  }

  return (
    <div className="flex items-center justify-center">
      <SparklineChart
        data={sparklinePoints}
        width={32}
        height={16}
        color="var(--muted-foreground)"
        showTrend={false}
      />
    </div>
  );
}
