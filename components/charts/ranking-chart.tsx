"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RankingHistory } from "@/lib/spotify/types";

interface RankingChartProps {
  title: string;
  data: RankingHistory[];
  color?: string;
  peakPosition?: number;
  timeRange?: "short_term" | "medium_term" | "long_term" | "all";
  showPeakLabel?: boolean;
}

export function RankingChart({
  title,
  data,
  color = "hsl(var(--primary))",
  peakPosition,
  timeRange,
  showPeakLabel = true,
}: RankingChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No historical data available yet. Check back after your next
            snapshot.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for the chart - reverse rank so higher = better
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    rank: item.rank,
    // Inverted for visual - lower rank is better
    displayRank: 51 - item.rank,
    isPeak: peakPosition ? item.rank === peakPosition : false,
  }));

  const timeRangeLabels: Record<string, string> = {
    short_term: "Last 4 Weeks",
    medium_term: "Last 6 Months",
    long_term: "All Time",
    all: "All Time",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {timeRange && (
            <span className="text-sm text-muted-foreground">
              {timeRangeLabels[timeRange] || "All Time"}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[1, 50]}
              reversed
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              label={{
                value: "Rank",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 12 },
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const isPeak = payload[0].payload.isPeak;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="text-sm font-medium flex items-center gap-1">
                        Rank #{payload[0].payload.rank}
                        {isPeak && <span>🏆</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {payload[0].payload.date}
                      </div>
                      {isPeak && (
                        <div className="text-xs text-yellow-600 dark:text-yellow-400">
                          Peak Position
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            {peakPosition && showPeakLabel && (
              <ReferenceLine
                y={peakPosition}
                stroke="hsl(var(--chart-4))"
                strokeDasharray="4 4"
                label={{
                  value: `Peak: #${peakPosition}`,
                  position: "right",
                  fill: "hsl(var(--chart-4))",
                  fontSize: 12,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="rank"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
