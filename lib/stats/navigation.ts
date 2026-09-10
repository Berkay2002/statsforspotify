import type { TimeRange } from "@/lib/spotify/types";

export type StatsItemType = "artist" | "track" | "album";

export function statsDetailHref(
  type: StatsItemType,
  id: string,
  timeRange: TimeRange,
  userId?: string,
  viewOwn = false,
) {
  const query = new URLSearchParams({ time_range: timeRange });
  if (userId) query.set("user_id", userId);
  if (userId && viewOwn) query.set("view", "me");
  return `/dashboard/${type}s/${encodeURIComponent(id)}?${query}`;
}
