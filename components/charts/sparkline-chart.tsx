"use client";

import React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { getRankMovementFromSeries } from "@/lib/rank-change";

interface SparklineChartProps {
  data: { date: string; rank: number }[];
  width?: number;
  height?: number;
  color?: string;
  showTrend?: boolean;
  invertRankForDisplay?: boolean;
}

type SparklineChartPoint = { date: string; rank: number; displayRank?: number };

const SparklineChart = React.memo(
  ({
    data,
    width = 64,
    height = 24,
    color = "var(--primary)",
    showTrend = true,
    invertRankForDisplay = true,
  }: SparklineChartProps) => {
    if (!data || data.length === 0) {
      return (
        <div style={{ width, height }} className="flex items-center justify-center">
          <div className="w-full h-px bg-muted" />
        </div>
      );
    }

    const chartData: SparklineChartPoint[] = invertRankForDisplay
      ? data.map((point) => ({ ...point, displayRank: 51 - point.rank }))
      : data;

    // Determine trend color
    let strokeColor = color;
    if (showTrend && data.length >= 2) {
      const movement = getRankMovementFromSeries({
        ranks: data.map((point) => point.rank),
        comparison: "window",
      });

      if (movement?.movement === "improved") {
        strokeColor = "var(--chart-1)";
      } else if (movement?.movement === "declined") {
        strokeColor = "var(--destructive)";
      } else if (movement?.movement === "unchanged") {
        strokeColor = "var(--muted-foreground)";
      }
    }

    return (
      <div style={{ width, height }} className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey={invertRankForDisplay ? "displayRank" : "rank"}
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
