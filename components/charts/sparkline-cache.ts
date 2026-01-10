export const SPARKLINE_CACHE_INVALIDATION_EVENT_NAME = "invalidate-sparklines";

export type SparklineDataPoint = { date: string; rank: number };
export type SparklinesByItemId = Record<string, SparklineDataPoint[]>;

export const SPARKLINE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const sparklineCacheByKey = new Map<
  string,
  { sparklinesByItemId: SparklinesByItemId; cachedAtTimestamp: number }
>();

export function readCachedSparklines(sparklinesCacheKey: string): SparklinesByItemId | null {
  const cachedEntry = sparklineCacheByKey.get(sparklinesCacheKey);
  if (!cachedEntry) return null;

  if (Date.now() - cachedEntry.cachedAtTimestamp > SPARKLINE_CACHE_TTL_MS) {
    sparklineCacheByKey.delete(sparklinesCacheKey);
    return null;
  }

  return cachedEntry.sparklinesByItemId;
}

export function writeCachedSparklines(sparklinesCacheKey: string, sparklinesByItemId: SparklinesByItemId) {
  sparklineCacheByKey.set(sparklinesCacheKey, {
    sparklinesByItemId,
    cachedAtTimestamp: Date.now(),
  });
}

export function clearSparklinesCache() {
  sparklineCacheByKey.clear();
}
