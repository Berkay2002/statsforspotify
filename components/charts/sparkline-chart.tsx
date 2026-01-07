"use client";

import React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface SparklineChartProps {
  data: { date: string; rank: number }[];
  width?: number;
  height?: number;
  color?: string;
  showTrend?: boolean;
}

const SparklineChart = React.memo(
  ({
    data,
    width = 64,
    height = 24,
    color = "hsl(var(--primary))",
    showTrend = true,
  }: SparklineChartProps) => {
    if (!data || data.length === 0) {
      return (
        <div style={{ width, height }} className="flex items-center justify-center">
          <div className="w-full h-px bg-muted" />
        </div>
      );
    }

    // Determine trend color
    let strokeColor = color;
    if (showTrend && data.length >= 2) {
      const firstRank = data[0].rank;
      const lastRank = data[data.length - 1].rank;
      
      if (lastRank < firstRank) {
        // Improved (lower rank number = better position)
        strokeColor = "hsl(var(--chart-2))"; // green
      } else if (lastRank > firstRank) {
        // Declined (higher rank number = worse position)
        strokeColor = "hsl(var(--destructive))"; // red
      } else {
        // Stable
        strokeColor = "hsl(var(--muted-foreground))"; // neutral
      }
    }

    return (
      <div style={{ width, height }} className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="rank"
              stroke={strokeColor}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for memoization
    if (prevProps.data.length !== nextProps.data.length) return false;
    if (prevProps.data.length === 0 && nextProps.data.length === 0) return true;
    if (prevProps.data.length > 0 && nextProps.data.length > 0) {
      const prevFirst = prevProps.data[0];
      const prevLast = prevProps.data[prevProps.data.length - 1];
      const nextFirst = nextProps.data[0];
      const nextLast = nextProps.data[nextProps.data.length - 1];
      
      if (
        prevFirst.rank !== nextFirst.rank ||
        prevLast.rank !== nextLast.rank
      ) {
        return false;
      }
    }
    return (
      prevProps.width === nextProps.width &&
      prevProps.height === nextProps.height &&
      prevProps.color === nextProps.color &&
      prevProps.showTrend === nextProps.showTrend
    );
  }
);

SparklineChart.displayName = "SparklineChart";

export default SparklineChart;
