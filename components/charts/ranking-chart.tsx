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

// Define theme-aware colors for rank changes
const RANK_CHANGE_COLORS = {
  improved: "var(--chart-1)", // Green
  declined: "var(--destructive)", // Red
  neutral: "var(--primary)", // Primary
} as const;

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
  const chartData = data.map((item) => {
    const previousRank = (item as any).previous_rank;
    const rankChange = previousRank ? previousRank - item.rank : 0;
    const isSignificant = Math.abs(rankChange) >= 5;
    
    return {
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      rank: item.rank,
      previous_rank: previousRank,
      rankChange,
      isSignificant,
      // Inverted for visual - lower rank is better
      displayRank: 51 - item.rank,
      isPeak: peakPosition ? item.rank === peakPosition : false,
    };
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
              const previousRank = data.previous_rank;
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
          dot={(props: any) => {
            const { cx, cy, payload } = props;
            if (!payload) return null;
            
            // Show colored dots for significant rank changes (±5)
            if (payload.isSignificant && payload.previous_rank) {
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
