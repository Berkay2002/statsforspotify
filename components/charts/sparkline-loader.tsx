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
    return <Skeleton className="w-16 h-6" />;
  }

  return <SparklineChart data={sparklines[itemId] ?? []} width={64} height={24} />;
}
