"use client";

import { useEffect, useState } from "react";
import SparklineChart from "@/components/charts/sparkline-chart";
import { Skeleton } from "@/components/ui/skeleton";

interface SparklineLoaderProps {
  itemIds: string[];
  type: "artist" | "track" | "album";
  children: (sparklines: Record<string, { date: string; rank: number }[]>, loading: boolean) => React.ReactNode;
}

export function SparklineLoader({ itemIds, type, children }: SparklineLoaderProps) {
  const [sparklines, setSparklines] = useState<
    Record<string, { date: string; rank: number }[]>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchSparklines = async () => {
      if (itemIds.length === 0) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) setLoading(true);
      
      const ids = itemIds.join(",");
      
      try {
        const res = await fetch(`/api/rankings/sparklines?type=${type}&ids=${ids}`);
        
        if (cancelled) return;
        
        const data = await res.json();
        
        if (!cancelled) {
          if (data.sparklines) {
            setSparklines(data.sparklines);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch sparklines:", err);
          setLoading(false);
        }
      }
    };

    fetchSparklines();

    return () => {
      cancelled = true;
    };
  }, [itemIds, type]);

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
