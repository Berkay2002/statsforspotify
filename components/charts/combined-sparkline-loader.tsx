"use client";

import { useEffect, useState } from "react";

interface CombinedSparklineLoaderProps {
  artistIds: string[];
  trackIds: string[];
  children: (sparklines: Record<string, { date: string; rank: number }[]>, loading: boolean) => React.ReactNode;
}

export function CombinedSparklineLoader({ artistIds, trackIds, children }: CombinedSparklineLoaderProps) {
  const [sparklines, setSparklines] = useState<
    Record<string, { date: string; rank: number }[]>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchSparklines = async () => {
      if (artistIds.length === 0 && trackIds.length === 0) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) setLoading(true);

      try {
        // Optimized: Fetch both artist and track sparklines in parallel
        const requests = [];
        
        if (artistIds.length > 0) {
          const artistIdsStr = artistIds.join(",");
          requests.push(
            fetch(`/api/rankings/sparklines?type=artist&ids=${artistIdsStr}`).then(r => r.json())
          );
        }
        
        if (trackIds.length > 0) {
          const trackIdsStr = trackIds.join(",");
          requests.push(
            fetch(`/api/rankings/sparklines?type=track&ids=${trackIdsStr}`).then(r => r.json())
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
          setSparklines(mergedSparklines);
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
  }, [artistIds, trackIds]);

  return <>{children(sparklines, loading)}</>;
}
