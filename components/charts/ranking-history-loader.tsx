"use client";

import { useEffect, useState } from "react";
import { RankingChart } from "@/components/charts/ranking-chart";
import { RankingBadge } from "@/components/charts/ranking-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { RankingHistoryResponse } from "@/lib/spotify/types";

interface RankingHistoryLoaderProps {
  itemId: string;
  itemType: "artist" | "track" | "album";
}

export function RankingHistoryLoader({ itemId, itemType }: RankingHistoryLoaderProps) {
  const [timeRange, setTimeRange] = useState<"all" | "short_term" | "medium_term" | "long_term">("all");
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
      });

      if (timeRange !== "all") {
        params.append("time_range", timeRange);
      }

      try {
        const res = await fetch(`/api/rankings/history?${params}`);
        
        if (cancelled) return;

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("No ranking history found yet");
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
            <h3 className="text-lg font-semibold">Ranking History</h3>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Ranking History</h3>
          <RankingBadge
            isNewEntry={data.metadata.totalSnapshots === 1}
            isReentry={mostRecentEntry?.isReentry}
          />
        </div>
        <Select value={timeRange} onValueChange={(value: string) => setTimeRange(value as "all" | "short_term" | "medium_term" | "long_term")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="short_term">Last 4 Weeks</SelectItem>
            <SelectItem value="medium_term">Last 6 Months</SelectItem>
            <SelectItem value="long_term">Long Term</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <RankingChart
        title="Position Over Time"
        data={data.history}
        peakPosition={data.metadata.peakRank}
        timeRange={timeRange}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">#{data.metadata.peakRank}</div>
            <div className="text-sm text-muted-foreground">Peak Position</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{data.metadata.totalSnapshots}</div>
            <div className="text-sm text-muted-foreground">Times Charted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              #{data.metadata.currentRank ?? "—"}
            </div>
            <div className="text-sm text-muted-foreground">Current Rank</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {new Date(data.metadata.firstSeen).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
            <div className="text-sm text-muted-foreground">First Seen</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
