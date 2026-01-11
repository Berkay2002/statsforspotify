"use client";

import { useEffect, useState } from "react";
import { RankingChart } from "@/components/charts/ranking-chart";
import { RankingBadge } from "@/components/charts/ranking-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { RankingHistoryResponse } from "@/lib/spotify/types";
import type { TimeRange } from "@/lib/spotify/types";

interface RankingHistoryLoaderProps {
  itemId: string;
  itemType: "artist" | "track" | "album";
  timeRange?: TimeRange;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
  showTimeRangeSelect?: boolean;
}

export function RankingHistoryLoader({
  itemId,
  itemType,
  timeRange: controlledTimeRange,
  onTimeRangeChange,
  showTimeRangeSelect = true,
}: RankingHistoryLoaderProps) {
  const [uncontrolledTimeRange, setUncontrolledTimeRange] = useState<TimeRange>("medium_term");
  const timeRange = controlledTimeRange ?? uncontrolledTimeRange;
  const [rankingHistoryResponse, setRankingHistoryResponse] = useState<RankingHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleTimeRangeChange = (nextTimeRange: TimeRange) => {
    if (controlledTimeRange) {
      onTimeRangeChange?.(nextTimeRange);
      return;
    }
    setUncontrolledTimeRange(nextTimeRange);
  };

  useEffect(() => {
    let isCancelled = false;

    const fetchRankingHistory = async () => {
      if (isCancelled) return;
      
      setError(null);

      const queryParameters = new URLSearchParams({
        type: itemType,
        id: itemId,
        time_range: timeRange, // Always send time_range (long_term = All Time)
      });

      try {
        const response = await fetch(`/api/rankings/history?${queryParameters}`);
        
        if (isCancelled) return;

        if (!response.ok) {
          if (response.status === 404) {
            // No history yet - this is expected for new items, handle gracefully
            if (!isCancelled) {
              setRankingHistoryResponse(null);
              setError(null);
              setIsLoading(false);
            }
            return;
          }
          throw new Error("Failed to fetch ranking history");
        }
        
        const responseBody = (await response.json()) as RankingHistoryResponse;
        
        if (!isCancelled) {
          setRankingHistoryResponse(responseBody);
          setIsLoading(false);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          console.error("Failed to fetch ranking history:", caughtError);
          setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
          setIsLoading(false);
        }
      }
    };

    setIsLoading(true);
    fetchRankingHistory();

    return () => {
      isCancelled = true;
    };
  }, [itemId, itemType, timeRange]);

  if (isLoading) {
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

  if (error || !rankingHistoryResponse) {
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

  const mostRecentEntry = rankingHistoryResponse.history[rankingHistoryResponse.history.length - 1];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <CardTitle>Ranking History</CardTitle>
          <RankingBadge
            isNewEntry={rankingHistoryResponse.metadata.totalSnapshots === 1}
            isReentry={mostRecentEntry?.isReentry}
          />
        </div>
        {showTimeRangeSelect && (
          <Select value={timeRange} onValueChange={(value: string) => handleTimeRangeChange(value as TimeRange)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="short_term">Past 4 weeks</SelectItem>
              <SelectItem value="medium_term">Past 6 months</SelectItem>
              <SelectItem value="long_term">All time</SelectItem>
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="h-[350px] w-full pt-2 pb-4">
          <RankingChart
            data={rankingHistoryResponse.history}
            peakPosition={rankingHistoryResponse.metadata.peakRank}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-6 border-t md:grid-cols-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Peak Position</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">#{rankingHistoryResponse.metadata.peakRank}</span>
              {rankingHistoryResponse.metadata.currentRank === rankingHistoryResponse.metadata.peakRank && (
                <span className="text-xs font-medium text-amber-500">Current</span>
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Current Rank</p>
            <div className="text-2xl font-bold">
              {rankingHistoryResponse.metadata.currentRank ? `#${rankingHistoryResponse.metadata.currentRank}` : "—"}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Times Charted</p>
            <div className="text-2xl font-bold">{rankingHistoryResponse.metadata.totalSnapshots}</div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">First Seen</p>
            <div className="text-2xl font-bold truncate">
              {new Date(rankingHistoryResponse.metadata.firstSeen).toLocaleDateString("en-US", {
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
