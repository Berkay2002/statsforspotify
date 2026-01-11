import type { TimeRange } from "@/lib/spotify/types";

export function isTimeRange(value: string | null | undefined): value is TimeRange {
  return value === "short_term" || value === "medium_term" || value === "long_term";
}

export function parseTimeRange(
  value: string | null | undefined,
  fallback: TimeRange = "medium_term"
): TimeRange {
  return isTimeRange(value) ? value : fallback;
}

