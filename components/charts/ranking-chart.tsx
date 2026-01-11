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
import type { RankingHistory } from "@/lib/spotify/types";
import { getRankDelta } from "@/lib/rank-change";

// Define theme-aware colors for rank changes
const RANK_CHANGE_COLORS = {
  improved: "var(--chart-1)", // Green
  declined: "var(--destructive)", // Red
  neutral: "var(--primary)", // Primary
} as const;

type RankingChartPoint = {
  date: string;
  rank: number;
  previousRank: number | null;
  rankChange: number;
  isSignificant: boolean;
  displayRank: number;
  isPeak: boolean;
};

interface RankingChartProps {
  data: RankingHistory[];
  color?: string;
  peakPosition?: number;
  showPeakLabel?: boolean;
}

export function RankingChart({
  data,
  color = "var(--primary)",
  peakPosition,
  showPeakLabel = true,
}: RankingChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No historical data available yet. Check back after your next snapshot.
      </div>
    );
  }

  // Format data for the chart - reverse rank so higher = better
  const chartData = data.map((item, index) => {
    const previousEntry = index > 0 ? data[index - 1] : null;
    const previousRank =
      item.isNewEntry || item.isReentry ? null : (previousEntry?.rank ?? null);
    const rankChange = getRankDelta({ previousRank, currentRank: item.rank }) ?? 0;
    const isSignificant = typeof previousRank === "number" && Math.abs(rankChange) >= 5;
    
    const point: RankingChartPoint = {
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      rank: item.rank,
      previousRank,
      rankChange,
      isSignificant,
      // Inverted for visual - lower rank is better
      displayRank: 51 - item.rank,
      isPeak: peakPosition ? item.rank === peakPosition : false,
    };

    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          minTickGap={30}
          dy={10}
        />
        <YAxis
          domain={[1, 50]}
          reversed
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={30}
          dx={-10}
        />
        <Tooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "4 4", opacity: 0.5 }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              const isPeak = data.isPeak;
              const previousRank = data.previousRank;
              const rankChange = data.rankChange;
              
              return (
                <div className="rounded-lg border bg-popover p-3 shadow-md text-popover-foreground">
                  <div className="text-sm font-semibold flex items-center gap-2 mb-1">
                    <span className="text-foreground">Rank #{data.rank}</span>
                    {rankChange !== 0 && (
                      <span className={rankChange > 0 ? "text-chart-1" : "text-destructive"}>
                         {rankChange > 0 ? "↑" : "↓"}{Math.abs(rankChange)}
                      </span>
                    )}
                    {isPeak && <span>🏆</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {data.date}
                  </div>
                  {typeof previousRank === "number" && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Previous: #{previousRank}
                    </div>
                  )}
                  {isPeak && (
                    <div className="text-xs font-medium text-amber-500 mt-1">
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
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{
              value: `Peak: #${peakPosition}`,
              position: "insideRight",
              fill: "#f59e0b",
              fontSize: 12,
              fontWeight: 500,
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey="rank"
          stroke={color}
          strokeWidth={3}
          activeDot={{ r: 6, fill: color, strokeWidth: 0 }}
          dot={(dotProps: { cx?: number; cy?: number; payload?: RankingChartPoint }) => {
            const { cx, cy, payload } = dotProps;
            if (!payload || typeof cx !== "number" || typeof cy !== "number") return null;
            
            // Show colored dots for significant rank changes (±5)
            if (payload.isSignificant && typeof payload.previousRank === "number") {
              const change = payload.rankChange;
              const dotColor = change > 0 ? RANK_CHANGE_COLORS.improved : RANK_CHANGE_COLORS.declined;
              
              return (
                <circle 
                  cx={cx} 
                  cy={cy} 
                  r={5} 
                  fill={dotColor} 
                  stroke="var(--background)" 
                  strokeWidth={2}
                />
              );
            }
            
            // Peak dot
            if (payload.isPeak) {
               return (
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={5} 
                    fill="#f59e0b" 
                    stroke="var(--background)" 
                    strokeWidth={2}
                  />
                );
            }

            return null; // Hide normal dots to reduce clutter
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
