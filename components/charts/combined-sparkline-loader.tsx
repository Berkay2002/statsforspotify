"use client";

import { useEffect, useState, useMemo, useRef } from "react";

interface CombinedSparklineLoaderProps {
  artistIds: string[];
  trackIds: string[];
  children: (sparklines: Record<string, { date: string; rank: number }[]>, loading: boolean) => React.ReactNode;
}

// Shared cache with SparklineLoader
const sparklineCache = new Map<string, { data: Record<string, { date: string; rank: number }[]>; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function CombinedSparklineLoader({ artistIds, trackIds, children }: CombinedSparklineLoaderProps) {
  const [sparklines, setSparklines] = useState<
    Record<string, { date: string; rank: number }[]>
  >({});
  const [loading, setLoading] = useState(true);

  // Stable keys to prevent unnecessary refetches
  const artistIdsKey = useMemo(() => artistIds.join(","), [artistIds]);
  const trackIdsKey = useMemo(() => trackIds.join(","), [trackIds]);
  const cacheKey = `combined:artist:${artistIdsKey}:track:${trackIdsKey}`;
  
  // Track ongoing requests to prevent duplicate fetches
  const fetchingRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSparklines = async () => {
      if (artistIds.length === 0 && trackIds.length === 0) {
        if (!cancelled) setLoading(false);
        return;
      }

      // Check cache first
      const cached = sparklineCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        if (!cancelled) {
          setSparklines(cached.data);
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
        const requests = [];
        
        if (artistIds.length > 0) {
          requests.push(
            fetch(`/api/rankings/sparklines?type=artist&ids=${artistIdsKey}`).then(r => r.json())
          );
        }
        
        if (trackIds.length > 0) {
          requests.push(
            fetch(`/api/rankings/sparklines?type=track&ids=${trackIdsKey}`).then(r => r.json())
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
          sparklineCache.set(cacheKey, {
            data: mergedSparklines,
            timestamp: Date.now(),
          });
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
  }, [artistIdsKey, trackIdsKey, artistIds.length, trackIds.length, cacheKey]); // Use stable keys

  return <>{children(sparklines, loading)}</>;
}
