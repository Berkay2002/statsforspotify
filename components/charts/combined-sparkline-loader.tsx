"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearSparklineCache,
  getCachedSparklines,
  setCachedSparklines,
  SPARKLINE_CACHE_INVALIDATE_EVENT,
  type SparklineMap,
} from "@/components/charts/sparkline-cache";

interface CombinedSparklineLoaderProps {
  artistIds: string[];
  trackIds: string[];
  children: (sparklines: Record<string, { date: string; rank: number }[]>, loading: boolean) => React.ReactNode;
}

export function CombinedSparklineLoader({ artistIds, trackIds, children }: CombinedSparklineLoaderProps) {
  const [sparklines, setSparklines] = useState<SparklineMap>({});
  const [loading, setLoading] = useState(true);
  const [cacheBuster, setCacheBuster] = useState(0);

  // Stable keys to prevent unnecessary refetches
  const artistIdsKey = useMemo(() => artistIds.join(","), [artistIds]);
  const trackIdsKey = useMemo(() => trackIds.join(","), [trackIds]);
  const cacheKey = `combined:artist:${artistIdsKey}:track:${trackIdsKey}`;
  
  // Track ongoing requests to prevent duplicate fetches
  const fetchingRef = useRef<string | null>(null);

  // Listen for cache invalidation events
  useEffect(() => {
    const handleInvalidate = () => {
      clearSparklineCache();
      fetchingRef.current = null;
      setCacheBuster((previousValue) => previousValue + 1);
    };
    
    window.addEventListener(SPARKLINE_CACHE_INVALIDATE_EVENT, handleInvalidate);
    return () => window.removeEventListener(SPARKLINE_CACHE_INVALIDATE_EVENT, handleInvalidate);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchSparklines = async () => {
      if (artistIds.length === 0 && trackIds.length === 0) {
        if (!cancelled) setLoading(false);
        return;
      }

      // Check cache first
      const cached = getCachedSparklines(cacheKey);
      if (cached) {
        if (!cancelled) {
          setSparklines(cached);
          setLoading(false);
        }
        return;
      }

      // Prevent duplicate requests for the same data
      if (fetchingRef.current === cacheKey) {
        return;
      }

      if (!cancelled) {
        setLoading(true);
        fetchingRef.current = cacheKey;
      }

      try {
        // Fetch both artist and track sparklines in parallel
        const requests: Array<Promise<{ sparklines?: SparklineMap }>> = [];
        
        if (artistIds.length > 0) {
          requests.push(
            fetch(`/api/rankings/sparklines?type=artist&ids=${artistIdsKey}`).then(async (response) => {
              if (!response.ok) {
                throw new Error("Failed to fetch artist sparklines");
              }
              return response.json();
            })
          );
        }
        
        if (trackIds.length > 0) {
          requests.push(
            fetch(`/api/rankings/sparklines?type=track&ids=${trackIdsKey}`).then(async (response) => {
              if (!response.ok) {
                throw new Error("Failed to fetch track sparklines");
              }
              return response.json();
            })
          );
        }

        const results = await Promise.all(requests);
        
        if (cancelled) return;

        // Merge all sparklines into a single object
        const mergedSparklines: Record<string, { date: string; rank: number }[]> = {};
        
        for (const result of results) {
          if (result.sparklines) {
            Object.assign(mergedSparklines, result.sparklines);
          }
        }

        if (!cancelled) {
          // Cache the result
          setCachedSparklines(cacheKey, mergedSparklines);
          setSparklines(mergedSparklines);
          setLoading(false);
          fetchingRef.current = null;
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch sparklines:", err);
          setLoading(false);
          fetchingRef.current = null;
        }
      }
    };

    fetchSparklines();

    return () => {
      cancelled = true;
    };
  }, [artistIdsKey, trackIdsKey, artistIds.length, trackIds.length, cacheKey, cacheBuster]); // Use stable keys

  return <>{children(sparklines, loading)}</>;
}
