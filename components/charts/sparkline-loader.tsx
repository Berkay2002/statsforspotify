"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearSparklinesCache,
  readCachedSparklines,
  writeCachedSparklines,
  SPARKLINE_CACHE_INVALIDATION_EVENT_NAME,
  type SparklinesByItemId,
} from "@/components/charts/sparkline-cache";

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

  const firstRank = sparklinePoints[0].rank;
  const lastRank = sparklinePoints[sparklinePoints.length - 1].rank;
  
  // Lower rank number = better position (went up)
  // Higher rank number = worse position (went down)
  if (lastRank < firstRank) {
    return (
      <div className="flex items-center justify-center text-green-500">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
      </div>
    );
  } else if (lastRank > firstRank) {
    return (
      <div className="flex items-center justify-center text-red-500">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }
  
  return null;
}
