# Ranking History Chart Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **REQUIRED SKILLS per task:**
> - Use `/frontend-design` skill for all visual/styling decisions — commit to bold aesthetic choices, no generic AI slop
> - Use `/shadcn` skill when working with shadcn components — follow component rules, use semantic colors, check docs before using components
>
> **shadcn project context:** Style: `radix-maia`, base: `radix`, Tailwind v4, icon library: `lucide`, import alias: `@/`, RSC enabled (use `"use client"` for interactive components). Installed components include: card, badge, popover, select, skeleton, separator, tooltip. Use `gap-*` not `space-x/y-*`. Use `size-*` for equal width/height. Use semantic colors (`bg-primary`, `text-muted-foreground`) not raw values.

**Goal:** Replace the Recharts ranking history chart with a custom SVG + Motion showpiece featuring animated line drawing, annotations, streak highlights, and premium interactions.

**Architecture:** Custom SVG rendered in a `"use client"` component. `framer-motion` for all animations. Inline linear scale helper for coordinate math. shadcn `Popover` for annotation click targets. `ResizeObserver` for responsive sizing. Stats row animated via `onAnimationComplete` callback from chart to loader.

**Tech Stack:** React 19, framer-motion v12, SVG, shadcn/ui (Popover, Card, Badge), Tailwind CSS v4, CSS variables

**Spec:** `docs/superpowers/specs/2026-03-27-ranking-chart-redesign.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `components/charts/chart-utils.ts` | Create | Scale helpers, smooth path builder, annotation derivation |
| `components/charts/ranking-chart.tsx` | Replace | Main chart: SVG container, grid, axes, line, area, streaks, annotations, hover |
| `components/charts/ranking-history-loader.tsx` | Edit | Pass `metadata` prop, animated stats row via callback, add legend |
| `app/globals.css` | Edit | Add `--chart-amber` CSS variable |
| `app/demo/page.tsx` | Delete | Remove after implementation verified |

---

## Task 1: Add `--chart-amber` CSS Variable

**Files:**
- Modify: `app/globals.css:27` (light theme), `app/globals.css:82` (dark theme), `app/globals.css:136` (theme inline)

- [ ] **Step 1: Add variable to light theme**

In `app/globals.css`, after the `--chart-5` line (line 31), add:

```css
  --chart-amber: oklch(0.8280 0.1194 84.4292);
```

- [ ] **Step 2: Add variable to dark theme**

In the `.dark` block, after the `--chart-5` line (line 86), add:

```css
  --chart-amber: oklch(0.8280 0.1194 84.4292);
```

This is the oklch equivalent of `#f59e0b` (Tailwind amber-500), consistent across both themes.

- [ ] **Step 3: Add to theme inline block**

In the `@theme inline` block, after `--color-chart-5` (line 139), add:

```css
  --color-chart-amber: var(--chart-amber);
```

- [ ] **Step 4: Verify build**

Run: `bun run build`
Expected: No errors. The variable is available as `var(--chart-amber)` in CSS and `text-chart-amber` / `bg-chart-amber` in Tailwind.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat(chart): add --chart-amber CSS variable for peak/streak highlights"
```

---

## Task 2: Create Chart Utilities

**Files:**
- Create: `components/charts/chart-utils.ts`

This file contains pure functions with no React dependencies — scale math, path generation, data processing.

- [ ] **Step 1: Create `chart-utils.ts` with all utilities**

Create `components/charts/chart-utils.ts`:

```typescript
import type { RankingHistory, RankingHistoryMetadata } from "@/lib/spotify/types";
import { getRankDelta } from "@/lib/rank-change";

// ─── Scale ───────────────────────────────────────────────────────────────────

export function linearScale(
  domain: [number, number],
  range: [number, number]
): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const ratio = (r1 - r0) / (d1 - d0);
  return (value: number) => r0 + (value - d0) * ratio;
}

// ─── Chart Point ─────────────────────────────────────────────────────────────

export interface ChartPoint {
  date: string;
  rank: number;
  x: number;
  y: number;
  isNewEntry: boolean;
  isReentry: boolean;
  isPeak: boolean;
  rankChange: number;
  isSignificant: boolean;
  streakTop5: boolean;
}

export interface ChartMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const CHART_MARGINS: ChartMargins = {
  top: 32,
  right: 24,
  bottom: 48,
  left: 52,
};

// ─── Smooth Path ─────────────────────────────────────────────────────────────
// Monotone cubic interpolation — generates SVG cubic bezier C commands that
// produce smooth curves without overshooting (important for rank data where
// values are discrete integers).

export function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    // Control point X is midpoint between prev and curr
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  return d;
}

export function buildAreaPath(
  linePath: string,
  points: { x: number; y: number }[],
  bottomY: number
): string {
  if (points.length < 2) return "";
  return (
    linePath +
    ` L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`
  );
}

// ─── Data Processing ─────────────────────────────────────────────────────────

export function processChartPoints(
  data: RankingHistory[],
  metadata: RankingHistoryMetadata,
  xScale: (i: number) => number,
  yScale: (rank: number) => number,
  margins: ChartMargins
): ChartPoint[] {
  return data.map((d, i) => {
    const prev = i > 0 ? data[i - 1] : null;
    const previousRank = d.isNewEntry || d.isReentry ? null : (prev?.rank ?? null);
    const rankChange = getRankDelta({ previousRank, currentRank: d.rank }) ?? 0;

    return {
      date: d.date,
      rank: d.rank,
      x: margins.left + xScale(i),
      y: margins.top + yScale(d.rank),
      isNewEntry: d.isNewEntry ?? false,
      isReentry: d.isReentry ?? false,
      isPeak: d.rank === metadata.peakRank,
      rankChange,
      isSignificant: Math.abs(rankChange) >= 5,
      streakTop5: d.rank <= 5,
    };
  });
}

// ─── Streak Regions ──────────────────────────────────────────────────────────

export interface StreakRegion {
  start: number;
  end: number;
}

export function computeStreakRegions(points: ChartPoint[]): StreakRegion[] {
  const regions: StreakRegion[] = [];
  let streakStart: number | null = null;

  for (let i = 0; i < points.length; i++) {
    if (points[i].streakTop5) {
      if (streakStart === null) streakStart = i;
    } else {
      if (streakStart !== null) {
        regions.push({ start: streakStart, end: i - 1 });
        streakStart = null;
      }
    }
  }
  if (streakStart !== null) {
    regions.push({ start: streakStart, end: points.length - 1 });
  }

  return regions;
}

// ─── Annotations ─────────────────────────────────────────────────────────────
// Priority: Peak > New Entry > Re-entry > Big Jump
// Max one annotation per data point.

export interface ChartAnnotation {
  point: ChartPoint;
  label: string;
  color: string;
  delay: number;
}

export function deriveAnnotations(
  points: ChartPoint[],
  metadata: RankingHistoryMetadata
): ChartAnnotation[] {
  const annotations: ChartAnnotation[] = [];
  const usedIndices = new Set<number>();

  // 1. Peak (first occurrence only)
  const peakIndex = points.findIndex((p) => p.isPeak);
  if (peakIndex !== -1) {
    annotations.push({
      point: points[peakIndex],
      label: `Peak #${metadata.peakRank}`,
      color: "var(--chart-amber)",
      delay: 0,
    });
    usedIndices.add(peakIndex);
  }

  // 2. New entry
  const newEntryIndex = points.findIndex(
    (p, i) => p.isNewEntry && !usedIndices.has(i)
  );
  if (newEntryIndex !== -1) {
    annotations.push({
      point: points[newEntryIndex],
      label: "Entered Chart",
      color: "var(--chart-4)",
      delay: 0.15,
    });
    usedIndices.add(newEntryIndex);
  }

  // 3. Re-entry
  const reentryIndex = points.findIndex(
    (p, i) => p.isReentry && !usedIndices.has(i)
  );
  if (reentryIndex !== -1) {
    annotations.push({
      point: points[reentryIndex],
      label: "Re-entered Chart",
      color: "var(--chart-4)",
      delay: 0.3,
    });
    usedIndices.add(reentryIndex);
  }

  // 4. Biggest jump (rankChange >= 5, not already annotated)
  let biggestJumpIndex = -1;
  let biggestJumpValue = 0;
  for (let i = 0; i < points.length; i++) {
    if (!usedIndices.has(i) && points[i].rankChange > biggestJumpValue) {
      biggestJumpValue = points[i].rankChange;
      biggestJumpIndex = i;
    }
  }
  if (biggestJumpIndex !== -1 && biggestJumpValue >= 5) {
    annotations.push({
      point: points[biggestJumpIndex],
      label: `+${biggestJumpValue} Jump`,
      color: "var(--chart-1)",
      delay: 0.45,
    });
  }

  return annotations;
}

// ─── Y-Axis Ticks ────────────────────────────────────────────────────────────

export function computeYTicks(minRank: number, maxRank: number): number[] {
  const range = maxRank - minRank;
  const step = range > 20 ? 10 : range > 10 ? 5 : 2;
  const ticks: number[] = [];

  for (let v = Math.ceil(minRank / step) * step; v <= maxRank; v += step) {
    ticks.push(v);
  }
  if (!ticks.includes(minRank)) ticks.unshift(minRank);

  return ticks;
}

// ─── X-Axis Label Thinning ───────────────────────────────────────────────────

export function shouldShowXLabel(
  index: number,
  total: number,
  isLast: boolean
): boolean {
  if (isLast) return true;
  const showEvery = total > 10 ? 3 : total > 6 ? 2 : 1;
  return index % showEvery === 0;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `bun run build`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add components/charts/chart-utils.ts
git commit -m "feat(chart): add chart utility functions — scales, paths, annotations"
```

---

## Task 3: Build the Ranking Chart Component

**Files:**
- Replace: `components/charts/ranking-chart.tsx`

This is the main visual component. It must use `"use client"` directive. Import all motion from `framer-motion`. Follow `/frontend-design` principles: bold gradient stroke, glow effects, animated line draw. Follow `/shadcn` rules: use semantic colors, `Popover` for annotations, `cn()` for conditional classes, `gap-*` not `space-*`.

> **Frontend design direction:** Dark, data-dense, Spotify-adjacent premium. Gradient line (purple→teal→green), gaussian blur glow, amber streak highlights, spring-animated interactions. This should feel like a premium data visualization, not a generic chart.

- [ ] **Step 1: Write the new ranking-chart.tsx**

Replace `components/charts/ranking-chart.tsx` entirely with:

```tsx
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
import type { RankingHistory, RankingHistoryMetadata } from "@/lib/spotify/types";
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
  type StreakRegion,
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
  }, [pathLength, progress, reducedMotion, onDrawComplete]);

  const dashOffset = useTransform(progress, [0, 1], [pathLength, 0]);

  if (reducedMotion) {
    return (
      <>
        <path
          d={path}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={3}
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
  chartLeft,
  chartRight,
  chartTop,
  chartBottom,
}: {
  points: ChartPoint[];
  chartLeft: number;
  chartRight: number;
  chartTop: number;
  chartBottom: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const tooltipY = useSpring(0, { stiffness: 300, damping: 30 });
  const tooltipX = useSpring(0, { stiffness: 300, damping: 30 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      const svg = e.currentTarget.ownerSVGElement;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

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

  const handleMouseLeave = useCallback(() => {
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
          <circle
            cx={hovered.x}
            cy={hovered.y}
            r={8}
            fill="var(--primary)"
            opacity={0.2}
          />
          {/* Solid dot */}
          <circle
            cx={hovered.x}
            cy={hovered.y}
            r={5}
            fill="var(--primary)"
            stroke="var(--background)"
            strokeWidth={2.5}
          />
          {/* Tooltip */}
          <foreignObject
            x={hovered.x - 80}
            y={hovered.y - 80}
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

  // Empty state
  if (data.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center text-muted-foreground">
        No historical data available yet. Check back after your next snapshot.
      </div>
    );
  }

  const margin = CHART_MARGINS;

  // Compute scales and points only when dimensions are available
  const chartData = useMemo(() => {
    if (!dimensions) return null;

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
      chartWidth,
      chartHeight,
      minRank,
      maxRank,
    };
  }, [data, metadata, dimensions, margin]);

  // Single point edge case
  const isSinglePoint = data.length === 1;

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

          {/* Grid lines */}
          {chartData.yTicks.map((tick) => {
            const y = margin.top + linearScale(
              [chartData.minRank, chartData.maxRank],
              [0, chartData.chartHeight]
            )(tick);
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
                i === chartData.points.length - 1
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
                fontFamily="var(--font-sans)"
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
            const top5Y =
              margin.top +
              linearScale(
                [chartData.minRank, chartData.maxRank],
                [0, chartData.chartHeight]
              )(5);

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
              y={
                margin.top +
                linearScale(
                  [chartData.minRank, chartData.maxRank],
                  [0, chartData.chartHeight]
                )(3)
              }
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

          {/* Peak reference line */}
          <motion.line
            x1={margin.left}
            x2={margin.left + chartData.chartWidth}
            y1={
              margin.top +
              linearScale(
                [chartData.minRank, chartData.maxRank],
                [0, chartData.chartHeight]
              )(metadata.peakRank)
            }
            y2={
              margin.top +
              linearScale(
                [chartData.minRank, chartData.maxRank],
                [0, chartData.chartHeight]
              )(metadata.peakRank)
            }
            stroke="var(--chart-amber)"
            strokeWidth={1}
            strokeDasharray="6 4"
            initial={reducedMotion ? { opacity: 0.5 } : { opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={
              reducedMotion ? undefined : { delay: 1.4, duration: 0.5 }
            }
          />

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
            />
          ) : (
            <AnimatedLine
              path={chartData.linePath}
              gradientId="ranking-line-grad"
              reducedMotion={reducedMotion}
              onDrawComplete={onAnimationComplete}
            />
          )}

          {/* Annotations */}
          {chartData.annotations.map((a) => (
            <AnnotationDot
              key={a.label}
              annotation={a}
              reducedMotion={reducedMotion}
            />
          ))}

          {/* Hover layer (on top of everything) */}
          {!isSinglePoint && (
            <HoverCursor
              points={chartData.points}
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
```

- [ ] **Step 2: Verify build**

Run: `bun run build`
Expected: No type errors, no build errors.

- [ ] **Step 3: Commit**

```bash
git add components/charts/ranking-chart.tsx
git commit -m "feat(chart): replace Recharts with custom SVG + Motion ranking chart"
```

---

## Task 4: Update the Ranking History Loader

**Files:**
- Modify: `components/charts/ranking-history-loader.tsx`

Changes:
1. Pass `metadata` instead of `peakPosition` to `RankingChart`
2. Add `onAnimationComplete` callback to trigger stats row animation
3. Animate stats row with staggered fade-in
4. Add inline legend to card header

Follow `/shadcn` rules: use `gap-*` for spacing, semantic colors for legend dots, `Badge` for snapshot count.

- [ ] **Step 1: Rewrite the loader**

Replace `components/charts/ranking-history-loader.tsx` entirely with:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { RankingChart } from "@/components/charts/ranking-chart";
import { RankingBadge } from "@/components/charts/ranking-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  RankingHistoryResponse,
  TimeRange,
} from "@/lib/spotify/types";

interface RankingHistoryLoaderProps {
  itemId: string;
  itemType: "artist" | "track" | "album";
  timeRange?: TimeRange;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
  showTimeRangeSelect?: boolean;
}

function StatItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2">
        <span
          className={`text-2xl font-bold tracking-tight ${highlight ? "text-chart-amber" : ""}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

export function RankingHistoryLoader({
  itemId,
  itemType,
  timeRange: controlledTimeRange,
  onTimeRangeChange,
  showTimeRangeSelect = true,
}: RankingHistoryLoaderProps) {
  const [uncontrolledTimeRange, setUncontrolledTimeRange] =
    useState<TimeRange>("medium_term");
  const timeRange = controlledTimeRange ?? uncontrolledTimeRange;
  const [rankingHistoryResponse, setRankingHistoryResponse] =
    useState<RankingHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);

  const handleTimeRangeChange = (nextTimeRange: TimeRange) => {
    if (controlledTimeRange) {
      onTimeRangeChange?.(nextTimeRange);
      return;
    }
    setUncontrolledTimeRange(nextTimeRange);
  };

  // Reset stats animation on time range change
  useEffect(() => {
    setShowStats(false);
  }, [timeRange]);

  const handleAnimationComplete = useCallback(() => {
    setShowStats(true);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const fetchRankingHistory = async () => {
      if (isCancelled) return;

      setError(null);

      const queryParameters = new URLSearchParams({
        type: itemType,
        id: itemId,
        time_range: timeRange,
      });

      try {
        const response = await fetch(
          `/api/rankings/history?${queryParameters}`
        );

        if (isCancelled) return;

        if (!response.ok) {
          if (response.status === 404) {
            if (!isCancelled) {
              setRankingHistoryResponse(null);
              setError(null);
              setIsLoading(false);
            }
            return;
          }
          throw new Error("Failed to fetch ranking history");
        }

        const responseBody =
          (await response.json()) as RankingHistoryResponse;

        if (!isCancelled) {
          setRankingHistoryResponse(responseBody);
          setIsLoading(false);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          console.error("Failed to fetch ranking history:", caughtError);
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unknown error"
          );
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
          <Skeleton className="h-[420px] w-full" />
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
          <div className="flex h-[420px] items-center justify-center text-muted-foreground">
            {error ||
              "No historical data available yet. Check back after your next snapshot."}
          </div>
        </CardContent>
      </Card>
    );
  }

  const mostRecentEntry =
    rankingHistoryResponse.history[
      rankingHistoryResponse.history.length - 1
    ];

  const statsItems = [
    {
      label: "Peak Position",
      value: `#${rankingHistoryResponse.metadata.peakRank}`,
      highlight:
        rankingHistoryResponse.metadata.currentRank ===
        rankingHistoryResponse.metadata.peakRank,
    },
    {
      label: "Current Rank",
      value: rankingHistoryResponse.metadata.currentRank
        ? `#${rankingHistoryResponse.metadata.currentRank}`
        : "—",
    },
    {
      label: "Times Charted",
      value: String(rankingHistoryResponse.metadata.totalSnapshots),
    },
    {
      label: "First Seen",
      value: new Date(
        rankingHistoryResponse.metadata.firstSeen
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
        <div className="flex items-center gap-3">
          <CardTitle>Ranking History</CardTitle>
          <RankingBadge
            isNewEntry={
              rankingHistoryResponse.metadata.totalSnapshots === 1
            }
            isReentry={mostRecentEntry?.isReentry}
          />
        </div>
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="hidden items-center gap-3 sm:flex">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block size-2 rounded-full bg-chart-amber" />
              Top 5 streak
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block size-2 rounded-full bg-primary" />
              Rank line
            </span>
          </div>
          {showTimeRangeSelect && (
            <Select
              value={timeRange}
              onValueChange={(value: string) =>
                handleTimeRangeChange(value as TimeRange)
              }
            >
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
        </div>
      </CardHeader>

      <CardContent>
        <RankingChart
          key={timeRange}
          data={rankingHistoryResponse.history}
          metadata={rankingHistoryResponse.metadata}
          onAnimationComplete={handleAnimationComplete}
        />

        {/* Animated stats row */}
        <div className="grid grid-cols-2 gap-4 border-t pt-6 md:grid-cols-4">
          {statsItems.map((item, i) => (
            <motion.div
              key={item.label}
              initial={showStats ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              animate={
                showStats ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }
              }
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <StatItem
                label={item.label}
                value={item.value}
                highlight={item.highlight}
              />
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `bun run build`
Expected: No errors. The loader skeleton height now matches the new chart height (420px).

- [ ] **Step 3: Visual test**

Open the artist/track/album detail page in the browser. Verify:
- Line draws with gradient and glow
- Annotations appear with pulsing rings, click to see popover
- Streak regions show amber highlight
- Stats row fades in after line draw completes
- Time range change replays animation
- Hover shows crosshair + tooltip

- [ ] **Step 4: Commit**

```bash
git add components/charts/ranking-history-loader.tsx
git commit -m "feat(chart): update loader with animated stats, legend, and metadata prop"
```

---

## Task 5: Clean Up Demo Page

**Files:**
- Delete: `app/demo/page.tsx`

- [ ] **Step 1: Delete the demo page**

```bash
rm app/demo/page.tsx
rmdir app/demo
```

- [ ] **Step 2: Verify build**

Run: `bun run build`
Expected: Clean build, no references to demo page.

- [ ] **Step 3: Commit**

```bash
git commit -am "chore: remove ranking chart demo page"
```

---

## Task 6: Verify and Lint

- [ ] **Step 1: Run lint**

Run: `bun run lint`
Expected: No errors or warnings in changed files.

- [ ] **Step 2: Run build**

Run: `bun run build`
Expected: Clean production build, no type errors.

- [ ] **Step 3: Fix any issues**

If lint or build fails, fix the issues and re-run.

- [ ] **Step 4: Commit fixes if any**

```bash
git add -A
git commit -m "fix(chart): address lint/build issues"
```
