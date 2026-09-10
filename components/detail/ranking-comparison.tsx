"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { StatsProfile } from "@/lib/stats/access";
import type { StatsItemType } from "@/lib/stats/navigation";
import type { RankingHistoryResponse, TimeRange } from "@/lib/spotify/types";

export function RankingComparison({ open, onOpenChange, itemType, itemId, itemName, timeRange, viewer, friends, initialFriendId }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: StatsItemType;
  itemId: string;
  itemName: string;
  timeRange: TimeRange;
  viewer: StatsProfile;
  friends: StatsProfile[];
  initialFriendId: string;
}) {
  const [chosenId, setChosenId] = useState(initialFriendId);
  const friend = friends.find((candidate) => candidate.userId === chosenId) ?? friends[0];
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["ranking-comparison", itemType, itemId, timeRange, viewer.userId, friend?.userId],
    enabled: open && !!friend,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    queryFn: async ({ signal }) => {
      return Promise.all([viewer, friend].map(async (profile): Promise<RankingHistoryResponse> => {
        const query = new URLSearchParams({ type: itemType, id: itemId, time_range: timeRange, user_id: profile.userId });
        const response = await fetch(`/api/rankings/history?${query}`, { signal, cache: "no-store" });
        if (!response.ok) throw new Error(response.status === 403 || response.status === 404
          ? "This comparison is no longer available for both users in this time range."
          : "Unable to load the comparison. Please try again.");
        return response.json();
      }));
    },
  });

  const points = new Map<string, { date: string; yours: number | null; friend: number | null }>();
  data?.forEach((response, index) => {
    for (const entry of response.history) {
      const date = entry.date.slice(0, 10);
      const point = points.get(date) ?? { date, yours: null, friend: null };
      point[index === 0 ? "yours" : "friend"] = entry.rank;
      points.set(date, point);
    }
  });
  const chartData = [...points.values()].sort((a, b) => a.date.localeCompare(b.date));
  const isolatedDot = (series: "yours" | "friend") => function IsolatedDot({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) {
    if (index === undefined || chartData[index]?.[series] == null ||
      chartData[index - 1]?.[series] != null || chartData[index + 1]?.[series] != null) return null;
    return <circle cx={cx} cy={cy} r={3} fill={series === "yours" ? "var(--primary)" : "var(--chart-amber)"} />;
  };
  const formatDate = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const rangeLabel = { short_term: "Past 4 weeks", medium_term: "Past 6 months", long_term: "All time" }[timeRange];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Compare rankings for {itemName}</DialogTitle>
          <DialogDescription>{rangeLabel}. Compare saved ranking positions, with #1 at the top.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="comparison-friend">Compare your history with</label>
          <Select value={friend?.userId} onValueChange={setChosenId}>
            <SelectTrigger id="comparison-friend" className="w-full sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {friends.map((candidate) => <SelectItem key={candidate.userId} value={candidate.userId}>
                {candidate.displayName}#{candidate.discriminator}
              </SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {error ? (
          <div role="alert" className="space-y-3"><p>{error.message}</p><Button onClick={() => refetch()}>Try again</Button></div>
        ) : isPending ? <p role="status">Loading ranking comparison...</p> : data && (
          <>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-2"><span className="w-6 border-t-2 border-primary" />You</span>
              <span className="flex items-center gap-2"><span className="w-6 border-t-2 border-dashed border-chart-amber" />{friend.displayName}</span>
            </div>
            <div className="h-72 w-full" role="img" aria-label={`Your ranking history compared with ${friend.displayName} for ${itemName}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 5, left: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={50} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickMargin={10} />
                  <YAxis reversed domain={[1, 50]} ticks={[1, 10, 20, 30, 40, 50]} tickFormatter={(value: number) => `#${value}`} width={40} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <Tooltip labelFormatter={(label) => formatDate(String(label))} formatter={(value) => `#${value}`} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 4" }} contentStyle={{ background: "var(--card)", borderColor: "var(--border)", borderRadius: 12, color: "var(--foreground)", fontSize: 13 }} />
                  <Line type="linear" dataKey="yours" name="You" stroke="var(--primary)" strokeWidth={2.5} dot={isolatedDot("yours")} activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
                  <Line type="linear" dataKey="friend" name={friend.displayName} stroke="var(--chart-amber)" strokeWidth={2.5} strokeDasharray="6 4" dot={isolatedDot("friend")} activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground">Gaps mean no saved ranking for that date. Ranking positions do not measure listening hours or play counts.</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] text-left text-sm [&_th]:px-3 [&_td]:px-3">
                <caption className="sr-only">Ranking summary for {itemName}</caption>
                <thead><tr className="border-b"><th className="py-2">Listener</th><th>Peak</th><th>Latest recorded</th><th>Times charted</th></tr></thead>
                <tbody>{data.map((response, index) => <tr key={index} className="border-b">
                  <th className="py-3 font-medium">{index === 0 ? "You" : friend.displayName}</th>
                  <td>#{response.metadata.peakRank}</td>
                  <td>#{response.history[response.history.length - 1]?.rank}</td>
                  <td>{response.metadata.totalSnapshots}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
