"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type {
  RankingHistory,
  RankingHistoryMetadata,
} from "@/lib/spotify/types";
import {
  linearScale,
  buildSmoothPath,
  buildAreaPath,
  processChartPoints,
  computeStreakRegions,
  deriveAnnotations,
  computeYTicks,
  shouldShowXLabel,
  CHART_MARGINS,
  type ChartPoint,
  type ChartAnnotation,
} from "./chart-utils";

// ─── Props ───────────────────────────────────────────────────────────────────

interface RankingChartProps {
  data: RankingHistory[];
  metadata: RankingHistoryMetadata;
  onAnimationComplete?: () => void;
}

// ─── Animated Line ───────────────────────────────────────────────────────────

function AnimatedLine({
  path,
  gradientId,
  reducedMotion,
  onDrawComplete,
}: {
  path: string;
  gradientId: string;
  reducedMotion: boolean;
  onDrawComplete?: () => void;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);
  const progress = useMotionValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, [path]);

  // Fix #2: Remove `progress` from deps — it's a MotionValue (ref-like)
  useEffect(() => {
    if (pathLength > 0 && !reducedMotion) {
      animate(progress, 1, {
        duration: 1.8,
        ease: [0.22, 1, 0.36, 1],
        onComplete: onDrawComplete,
      });
    } else if (reducedMotion) {
      onDrawComplete?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathLength, reducedMotion, onDrawComplete]);

  const dashOffset = useTransform(progress, [0, 1], [pathLength, 0]);

  if (reducedMotion) {
    return (
      <>
        <path
          d={path}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.15}
          filter="url(#glow)"
        />
        <path
          d={path}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }

  return (
    <>
      {/* Glow layer */}
      <motion.path
        ref={pathRef}
        d={path}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.15}
        filter="url(#glow)"
        style={{
          strokeDasharray: pathLength,
          strokeDashoffset: dashOffset,
        }}
      />
      {/* Main line */}
      <motion.path
        d={path}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: pathLength,
          strokeDashoffset: dashOffset,
        }}
      />
    </>
  );
}

// ─── Annotation Dot ──────────────────────────────────────────────────────────

function AnnotationDot({
  annotation,
  reducedMotion,
}: {
  annotation: ChartAnnotation;
  reducedMotion: boolean;
}) {
  const { point, label, color, delay } = annotation;

  const dotContent = (
    <g style={{ cursor: "pointer" }}>
      {/* Pulse ring */}
      {!reducedMotion && (
        <motion.circle
          cx={point.x}
          cy={point.y}
          r={12}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          opacity={0.4}
          animate={{ r: [12, 18, 12], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {/* Solid dot */}
      <circle
        cx={point.x}
        cy={point.y}
        r={6}
        fill={color}
        stroke="var(--background)"
        strokeWidth={2.5}
      />
    </g>
  );

  const wrapper = reducedMotion ? (
    <g>{dotContent}</g>
  ) : (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay + 1.2, duration: 0.4, type: "spring" }}
    >
      {dotContent}
    </motion.g>
  );

  return (
    <Popover>
      {/* Fix #8: Use point index as key — handled by caller via index prop */}
      <PopoverTrigger asChild>{wrapper}</PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-auto px-3 py-2 text-sm"
        sideOffset={12}
      >
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">
          {new Date(point.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Hover Cursor ────────────────────────────────────────────────────────────

function HoverCursor({
  points,
  dimensions,
  chartLeft,
  chartRight,
  chartTop,
  chartBottom,
}: {
  points: ChartPoint[];
  dimensions: { width: number; height: number };
  chartLeft: number;
  chartRight: number;
  chartTop: number;
  chartBottom: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // Fix #6: Spring-animated dot using motion values
  const tooltipX = useSpring(0, { stiffness: 300, damping: 30 });
  const tooltipY = useSpring(0, { stiffness: 300, damping: 30 });

  const findClosestPoint = useCallback(
    (clientX: number, svgElement: SVGSVGElement) => {
      const rect = svgElement.getBoundingClientRect();
      const mouseX = clientX - rect.left;

      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < points.length; i++) {
        const dist = Math.abs(points[i].x - mouseX);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }
      setHoveredIndex(closest);
      tooltipX.set(points[closest].x);
      tooltipY.set(points[closest].y);
    },
    [points, tooltipX, tooltipY]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      const svg = e.currentTarget.ownerSVGElement;
      if (!svg) return;
      findClosestPoint(e.clientX, svg);
    },
    [findClosestPoint]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  // Fix #7: Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<SVGRectElement>) => {
      const svg = e.currentTarget.ownerSVGElement;
      if (!svg || !e.touches[0]) return;
      findClosestPoint(e.touches[0].clientX, svg);
    },
    [findClosestPoint]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<SVGRectElement>) => {
      const svg = e.currentTarget.ownerSVGElement;
      if (!svg || !e.touches[0]) return;
      findClosestPoint(e.touches[0].clientX, svg);
    },
    [findClosestPoint]
  );

  const handleTouchEnd = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <>
      <rect
        x={chartLeft}
        y={chartTop}
        width={chartRight - chartLeft}
        height={chartBottom - chartTop}
        fill="transparent"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: "crosshair" }}
      />
      {hovered && (
        <>
          {/* Vertical crosshair */}
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={chartTop}
            y2={chartBottom}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.4}
          />
          {/* Glow dot */}
          <motion.circle
            r={8}
            fill="var(--primary)"
            opacity={0.2}
            style={{ cx: tooltipX, cy: tooltipY }}
          />
          {/* Fix #6: Spring-animated solid dot */}
          <motion.circle
            r={5}
            fill="var(--primary)"
            stroke="var(--background)"
            strokeWidth={2.5}
            style={{ cx: tooltipX, cy: tooltipY }}
          />
          {/* Fix #5: Clamped tooltip foreignObject position */}
          <foreignObject
            x={Math.max(
              0,
              Math.min(hovered.x - 80, dimensions.width - 160)
            )}
            y={Math.max(0, hovered.y - 80)}
            width={160}
            height={68}
            style={{ pointerEvents: "none", overflow: "visible" }}
          >
            <div className="flex flex-col items-center">
              <div className="rounded-lg border bg-popover px-3 py-2 shadow-lg text-popover-foreground text-center">
                <div className="flex items-center justify-center gap-1.5 text-sm font-bold">
                  <span>#{hovered.rank}</span>
                  {hovered.rankChange !== 0 && (
                    <span
                      className={
                        hovered.rankChange > 0
                          ? "text-chart-1"
                          : "text-destructive"
                      }
                    >
                      {hovered.rankChange > 0 ? "+" : ""}
                      {hovered.rankChange}
                    </span>
                  )}
                  {hovered.isPeak && (
                    <span className="text-xs text-chart-amber font-semibold">
                      PEAK
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(hovered.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>
          </foreignObject>
        </>
      )}
    </>
  );
}

// ─── Main Chart ──────────────────────────────────────────────────────────────

export function RankingChart({
  data,
  metadata,
  onAnimationComplete,
}: RankingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const reducedMotion = useReducedMotion() ?? false;

  // ResizeObserver for responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const margin = CHART_MARGINS;

  // Hooks must be called unconditionally — compute chart data even for empty state
  const chartData = useMemo(() => {
    if (!dimensions || data.length === 0) return null;

    const chartWidth = dimensions.width - margin.left - margin.right;
    const chartHeight = dimensions.height - margin.top - margin.bottom;

    const ranks = data.map((d) => d.rank);
    const minRank = Math.max(1, Math.min(...ranks) - 2);
    const maxRank = Math.min(50, Math.max(...ranks) + 3);

    const xScale = linearScale([0, data.length - 1], [0, chartWidth]);
    const yScale = linearScale([minRank, maxRank], [0, chartHeight]);

    const points = processChartPoints(data, metadata, xScale, yScale, margin);
    const linePath = buildSmoothPath(points);
    const areaPath = buildAreaPath(linePath, points, margin.top + chartHeight);
    const streakRegions = computeStreakRegions(points);
    const annotations = deriveAnnotations(points, metadata);
    const yTicks = computeYTicks(minRank, maxRank);

    return {
      points,
      linePath,
      areaPath,
      streakRegions,
      annotations,
      yTicks,
      yScale,
      chartWidth,
      chartHeight,
      minRank,
      maxRank,
    };
  }, [data, metadata, dimensions, margin]);

  const isSinglePoint = data.length === 1;

  // Empty state
  if (data.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center text-muted-foreground">
        No historical data available yet. Check back after your next snapshot.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-[420px] w-full">
      {dimensions && chartData && (
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient
              id="ranking-line-grad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="var(--chart-4)" />
              <stop offset="50%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--chart-1)" />
            </linearGradient>
            <linearGradient
              id="ranking-area-grad"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="var(--primary)"
                stopOpacity={0.15}
              />
              <stop
                offset="100%"
                stopColor="var(--primary)"
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient
              id="ranking-streak-grad"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="var(--chart-amber)"
                stopOpacity={0.12}
              />
              <stop
                offset="100%"
                stopColor="var(--chart-amber)"
                stopOpacity={0}
              />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines + Y-axis labels */}
          {chartData.yTicks.map((tick) => {
            // Fix #1: Reuse chartData.yScale instead of recreating linearScale
            const y = margin.top + chartData.yScale(tick);
            return (
              <g key={tick}>
                <line
                  x1={margin.left}
                  x2={margin.left + chartData.chartWidth}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="2 4"
                  opacity={0.5}
                />
                <text
                  x={margin.left - 12}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="var(--muted-foreground)"
                  fontSize={12}
                  fontFamily="var(--font-mono)"
                >
                  #{tick}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {chartData.points.map((p, i) => {
            if (
              !shouldShowXLabel(
                i,
                chartData.points.length,
                i === chartData.points.length - 1,
                chartData.chartWidth
              )
            )
              return null;
            return (
              <text
                key={p.date}
                x={p.x}
                y={margin.top + chartData.chartHeight + 28}
                textAnchor="middle"
                fill="var(--muted-foreground)"
                fontSize={11}
                // Fix #3: Use monospace font for X-axis labels
                fontFamily="var(--font-mono)"
              >
                {new Date(p.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </text>
            );
          })}

          {/* Streak highlight regions */}
          {chartData.streakRegions.map((region, i) => {
            const pts = chartData.points;
            const x1 =
              region.start > 0
                ? (pts[region.start - 1].x + pts[region.start].x) / 2
                : pts[region.start].x - 10;
            const x2 =
              region.end < pts.length - 1
                ? (pts[region.end].x + pts[region.end + 1].x) / 2
                : pts[region.end].x + 10;
            const top5Y = margin.top + chartData.yScale(5);

            return (
              <motion.rect
                key={i}
                x={x1}
                y={margin.top}
                width={x2 - x1}
                height={top5Y - margin.top}
                fill="url(#ranking-streak-grad)"
                rx={4}
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={
                  reducedMotion ? undefined : { delay: 1.6, duration: 0.6 }
                }
              />
            );
          })}

          {/* Top 5 label */}
          {chartData.streakRegions.length > 0 && (
            <motion.text
              x={margin.left + chartData.chartWidth + 4}
              y={margin.top + chartData.yScale(3)}
              fill="var(--chart-amber)"
              fontSize={10}
              fontFamily="var(--font-mono)"
              fontWeight={600}
              initial={reducedMotion ? { opacity: 0.7 } : { opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={reducedMotion ? undefined : { delay: 1.8 }}
            >
              TOP 5
            </motion.text>
          )}

          {/* Fix #4: Guard peak reference line — only render if peak is within visible range */}
          {metadata.peakRank >= chartData.minRank &&
            metadata.peakRank <= chartData.maxRank && (
              <motion.line
                x1={margin.left}
                x2={margin.left + chartData.chartWidth}
                y1={margin.top + chartData.yScale(metadata.peakRank)}
                y2={margin.top + chartData.yScale(metadata.peakRank)}
                stroke="var(--chart-amber)"
                strokeWidth={1}
                strokeDasharray="6 4"
                initial={reducedMotion ? { opacity: 0.5 } : { opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={
                  reducedMotion ? undefined : { delay: 1.4, duration: 0.5 }
                }
              />
            )}

          {/* Area fill */}
          {!isSinglePoint && (
            <motion.path
              d={chartData.areaPath}
              fill="url(#ranking-area-grad)"
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={
                reducedMotion ? undefined : { delay: 0.8, duration: 1 }
              }
            />
          )}

          {/* Line or single dot */}
          {isSinglePoint ? (
            <motion.circle
              cx={chartData.points[0].x}
              cy={chartData.points[0].y}
              r={6}
              fill="var(--primary)"
              stroke="var(--background)"
              strokeWidth={2.5}
              initial={reducedMotion ? { scale: 1 } : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              onAnimationComplete={onAnimationComplete}
            />
          ) : (
            <AnimatedLine
              path={chartData.linePath}
              gradientId="ranking-line-grad"
              reducedMotion={reducedMotion}
              onDrawComplete={onAnimationComplete}
            />
          )}

          {/* Fix #8: Annotations — use index as key, not label */}
          {chartData.annotations.map((a, i) => (
            <AnnotationDot
              key={i}
              annotation={a}
              reducedMotion={reducedMotion}
            />
          ))}

          {/* Hover layer (on top of everything) */}
          {!isSinglePoint && (
            <HoverCursor
              points={chartData.points}
              dimensions={dimensions}
              chartLeft={margin.left}
              chartRight={margin.left + chartData.chartWidth}
              chartTop={margin.top}
              chartBottom={margin.top + chartData.chartHeight}
            />
          )}
        </svg>
      )}
    </div>
  );
}
