export const SPARKLINE_CACHE_INVALIDATE_EVENT = "invalidate-sparklines";

export type SparklinePoint = { date: string; rank: number };
export type SparklineMap = Record<string, SparklinePoint[]>;

export const SPARKLINE_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const sparklineCache = new Map<
  string,
  { data: SparklineMap; timestamp: number }
>();

export function getCachedSparklines(cacheKey: string): SparklineMap | null {
  const cachedEntry = sparklineCache.get(cacheKey);
  if (!cachedEntry) return null;

  if (Date.now() - cachedEntry.timestamp > SPARKLINE_CACHE_DURATION_MS) {
    sparklineCache.delete(cacheKey);
    return null;
  }

  return cachedEntry.data;
}

export function setCachedSparklines(cacheKey: string, data: SparklineMap) {
  sparklineCache.set(cacheKey, { data, timestamp: Date.now() });
}

export function clearSparklineCache() {
  sparklineCache.clear();
}
