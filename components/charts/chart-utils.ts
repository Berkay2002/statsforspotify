import type { RankingHistory, RankingHistoryMetadata } from "@/lib/spotify/types";
import { getRankDelta } from "@/lib/rank-change";

// ─── Scale ───────────────────────────────────────────────────────────────────

export function linearScale(
  domain: [number, number],
  range: [number, number]
): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d1 === d0) return () => (r0 + r1) / 2;
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

export const CHART_MARGINS: Readonly<ChartMargins> = Object.freeze({
  top: 32,
  right: 24,
  bottom: 48,
  left: 52,
});

// ─── Smooth Path ─────────────────────────────────────────────────────────────
// Cubic Hermite spline with midpoint control points — generates smooth SVG
// curves without sharp corners between data points.

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
  isLast: boolean,
  chartWidth?: number
): boolean {
  if (total <= 1) return true;
  if (isLast) return true;
  if (index === 0) return true;

  // ~45px per label at 11px monospace ("Mar 27")
  const MIN_LABEL_WIDTH = 45;
  const pixelsPerPoint = (chartWidth ?? 600) / (total - 1);
  const showEvery = Math.max(1, Math.ceil(MIN_LABEL_WIDTH / pixelsPerPoint));

  return index % showEvery === 0;
}
