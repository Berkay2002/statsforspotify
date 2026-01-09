"use client";

import { useEffect, useState } from "react";
import { RankingChart } from "@/components/charts/ranking-chart";
import { RankingBadge } from "@/components/charts/ranking-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { RankingHistoryResponse } from "@/lib/spotify/types";

interface RankingHistoryLoaderProps {
  itemId: string;
  itemType: "artist" | "track" | "album";
}

export function RankingHistoryLoader({ itemId, itemType }: RankingHistoryLoaderProps) {
  const [timeRange, setTimeRange] = useState<"short_term" | "medium_term" | "long_term">("long_term");
  const [data, setData] = useState<RankingHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      if (cancelled) return;
      
      setError(null);

      const params = new URLSearchParams({
        type: itemType,
        id: itemId,
        time_range: timeRange, // Always send time_range (long_term = All Time)
      });

      try {
        const res = await fetch(`/api/rankings/history?${params}`);
        
        if (cancelled) return;

        if (!res.ok) {
          if (res.status === 404) {
            // No history yet - this is expected for new items, handle gracefully
            if (!cancelled) {
              setData(null);
              setError(null);
              setLoading(false);
            }
            return;
          }
          throw new Error("Failed to fetch ranking history");
        }
        
        const responseData = await res.json();
        
        if (!cancelled) {
          setData(responseData);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch ranking history:", err);
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      }
    };

    setLoading(true);
    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [itemId, itemType, timeRange]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ranking History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            {error || "No historical data available yet. Check back after your next snapshot."}
          </div>
        </CardContent>
      </Card>
    );
  }

  const mostRecentEntry = data.history[data.history.length - 1];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <CardTitle>Ranking History</CardTitle>
          <RankingBadge
            isNewEntry={data.metadata.totalSnapshots === 1}
            isReentry={mostRecentEntry?.isReentry}
          />
        </div>
        <Select 
          value={timeRange} 
          onValueChange={(value: string) => setTimeRange(value as "short_term" | "medium_term" | "long_term")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="long_term">All Time</SelectItem>
            <SelectItem value="short_term">Last 4 Weeks</SelectItem>
            <SelectItem value="medium_term">Last 6 Months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      
      <CardContent>
        <div className="h-[350px] w-full pt-2 pb-4">
          <RankingChart
            data={data.history}
            peakPosition={data.metadata.peakRank}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-6 border-t md:grid-cols-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Peak Position</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">#{data.metadata.peakRank}</span>
              {data.metadata.currentRank === data.metadata.peakRank && (
                <span className="text-xs font-medium text-amber-500">Current</span>
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Current Rank</p>
            <div className="text-2xl font-bold">
              {data.metadata.currentRank ? `#${data.metadata.currentRank}` : "—"}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Times Charted</p>
            <div className="text-2xl font-bold">{data.metadata.totalSnapshots}</div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">First Seen</p>
            <div className="text-2xl font-bold truncate">
              {new Date(data.metadata.firstSeen).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
