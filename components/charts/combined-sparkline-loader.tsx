"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearSparklinesCache,
  readCachedSparklines,
  writeCachedSparklines,
  SPARKLINE_CACHE_INVALIDATION_EVENT_NAME,
  type SparklinesByItemId,
} from "@/components/charts/sparkline-cache";

import type { TimeRange } from "@/lib/spotify/types";

interface CombinedSparklineLoaderProps {
  artistIds: string[];
  trackIds: string[];
  timeRange?: TimeRange;
  children: (sparklinesByItemId: SparklinesByItemId, isLoading: boolean) => React.ReactNode;
}

export function CombinedSparklineLoader({ artistIds, trackIds, timeRange = "medium_term", children }: CombinedSparklineLoaderProps) {
  const [sparklinesByItemId, setSparklinesByItemId] = useState<SparklinesByItemId>({});
  const [isLoading, setIsLoading] = useState(true);
  const [cacheInvalidationCounter, setCacheInvalidationCounter] = useState(0);

  // Stable keys to prevent unnecessary refetches
  const artistIdsSignature = useMemo(() => artistIds.join(","), [artistIds]);
  const trackIdsSignature = useMemo(() => trackIds.join(","), [trackIds]);
  const combinedSparklinesCacheKey = `combined:${timeRange}:artist:${artistIdsSignature}:track:${trackIdsSignature}`;
  

  // Listen for cache invalidation events
  useEffect(() => {
    const handleSparklinesCacheInvalidation = () => {
      clearSparklinesCache();
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
    const controller = new AbortController();

    const fetchSparklines = async () => {
      if (artistIds.length === 0 && trackIds.length === 0) {
        if (!isCancelled) {
          setSparklinesByItemId({});
          setIsLoading(false);
        }
        return;
      }

      // Check cache first
      const cached = readCachedSparklines(combinedSparklinesCacheKey);
      if (cached) {
        if (!isCancelled) {
          setSparklinesByItemId(cached);
          setIsLoading(false);
        }
        return;
      }

      if (!isCancelled) {
        setIsLoading(true);
        setSparklinesByItemId({});
      }

      try {
        // Fetch both artist and track sparklines in parallel
        const fetchRequests: Array<Promise<{ sparklines?: SparklinesByItemId }>> = [];
        
        if (artistIds.length > 0) {
          fetchRequests.push(
            fetch(`/api/rankings/sparklines?type=artist&ids=${artistIdsSignature}&time_range=${timeRange}`, { signal: controller.signal, cache: "no-store" }).then(async (response) => {
              if (!response.ok) {
                throw new Error("Failed to fetch artist sparklines");
              }
              return response.json();
            })
          );
        }
        
        if (trackIds.length > 0) {
          fetchRequests.push(
            fetch(`/api/rankings/sparklines?type=track&ids=${trackIdsSignature}&time_range=${timeRange}`, { signal: controller.signal, cache: "no-store" }).then(async (response) => {
              if (!response.ok) {
                throw new Error("Failed to fetch track sparklines");
              }
              return response.json();
            })
          );
        }

        const responseBodies = await Promise.all(fetchRequests);
        
        if (isCancelled) return;

        // Merge all sparklines into a single object
        const combinedSparklinesByItemId: SparklinesByItemId = {};
        
        for (const responseBody of responseBodies) {
          if (responseBody.sparklines) {
            Object.assign(combinedSparklinesByItemId, responseBody.sparklines);
          }
        }

        if (!isCancelled) {
          // Cache the result
          writeCachedSparklines(combinedSparklinesCacheKey, combinedSparklinesByItemId);
          setSparklinesByItemId(combinedSparklinesByItemId);
          setIsLoading(false);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          console.error("Failed to fetch sparklines:", caughtError);
          setIsLoading(false);
        }
      }
    };

    fetchSparklines();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [
    timeRange,
    artistIdsSignature,
    trackIdsSignature,
    artistIds.length,
    trackIds.length,
    combinedSparklinesCacheKey,
    cacheInvalidationCounter,
  ]); // Use stable keys

  return <>{children(sparklinesByItemId, isLoading)}</>;
}
