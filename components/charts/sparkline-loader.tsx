"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearSparklineCache,
  getCachedSparklines,
  setCachedSparklines,
  SPARKLINE_CACHE_INVALIDATE_EVENT,
  type SparklineMap,
} from "@/components/charts/sparkline-cache";

interface SparklineLoaderProps {
  itemIds: string[];
  type: "artist" | "track" | "album";
  children: (sparklines: Record<string, { date: string; rank: number }[]>, loading: boolean) => React.ReactNode;
}

export function SparklineLoader({ itemIds, type, children }: SparklineLoaderProps) {
  const [sparklines, setSparklines] = useState<SparklineMap>({});
  const [loading, setLoading] = useState(true);
  const [cacheBuster, setCacheBuster] = useState(0);

  // Stable key to prevent unnecessary refetches when array reference changes
  // Only refetch if the actual IDs or their order changes
  const itemIdsKey = useMemo(() => itemIds.join(","), [itemIds]);
  const cacheKey = `${type}:${itemIdsKey}`;
  
  // Track ongoing requests to prevent duplicate fetches
  const fetchingRef = useRef<string | null>(null);

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
      if (itemIds.length === 0) {
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
        const response = await fetch(`/api/rankings/sparklines?type=${type}&ids=${itemIdsKey}`);
        
        if (cancelled) return;
        
        if (!response.ok) {
          throw new Error("Failed to fetch sparklines");
        }

        const data = await response.json();
        
        if (!cancelled) {
          if (data.sparklines) {
            // Cache the result
            setCachedSparklines(cacheKey, data.sparklines);
            setSparklines(data.sparklines);
          }
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
  }, [itemIds.length, itemIdsKey, type, cacheKey, cacheBuster]); // Use stable key instead of itemIds array

  return <>{children(sparklines, loading)}</>;
}

interface InlineSparklineProps {
  itemId: string;
  sparklines: Record<string, { date: string; rank: number }[]>;
  loading: boolean;
}

export function InlineSparkline({ itemId, sparklines, loading }: InlineSparklineProps) {
  if (loading) {
    return null;
  }

  const data = sparklines[itemId];
  if (!data || data.length < 2) {
    return null;
  }

  const firstRank = data[0].rank;
  const lastRank = data[data.length - 1].rank;
  
  // Lower rank number = better position (went up)
  // Higher rank number = worse position (went down)
  if (lastRank < firstRank) {
    return (
      <div className="flex items-center justify-center text-green-500">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
    );
  } else if (lastRank > firstRank) {
    return (
      <div className="flex items-center justify-center text-red-500">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }
  
  return null;
}
