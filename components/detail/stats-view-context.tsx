"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { parseTimeRange } from "@/lib/spotify/time-range";
import { statsDetailHref, type StatsItemType } from "@/lib/stats/navigation";
import type { StatsProfile } from "@/lib/stats/access";
import { RankingComparison } from "@/components/detail/ranking-comparison";

interface Viewers {
  viewer: StatsProfile;
  owner: StatsProfile;
  friends: StatsProfile[];
}

interface StatsView extends Viewers {
  userId: string;
  isOwn: boolean;
  displayName: string;
  detailHref: (type: StatsItemType, id: string) => string;
  backHref: string;
}

const StatsViewContext = createContext<StatsView | null>(null);

export function useStatsView() {
  const context = useContext(StatsViewContext);
  if (!context) throw new Error("Stats detail pages require StatsViewProvider");
  return context;
}

export function StatsViewProvider({ itemType, children }: { itemType: StatsItemType; children: ReactNode }) {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const sourceUserId = search.get("user_id") || undefined;
  const viewOwn = search.get("view") === "me";
  const timeRange = parseTimeRange(search.get("time_range"), "medium_term");
  const query = new URLSearchParams({ type: itemType, id: params.id, time_range: timeRange });
  if (sourceUserId) query.set("user_id", sourceUserId);
  const queryString = query.toString();
  const { data, error, isPending, refetch } = useQuery<Viewers>({
    queryKey: ["stats-viewers", queryString, viewOwn],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/rankings/viewers?${queryString}`, { signal, cache: "no-store" });
      if (!response.ok) {
        throw new Error(response.status === 403
          ? "These stats are not available. The friendship or sharing settings may have changed."
          : "Unable to load these stats. Please try again.");
      }
      return response.json();
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  if (isPending) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4" role="alert">
      <p>{error?.message || "Unable to load these stats."}</p>
      <Button onClick={() => refetch()}>Try again</Button>
      <Link href="/dashboard/friends" className="underline">Back to friends</Link>
    </div>
  );

  const selected = viewOwn ? data.viewer : data.owner;
  const isOwn = selected.userId === data.viewer.userId;
  const friendHref = `/dashboard/friends/${encodeURIComponent(data.owner.displayName)}/${encodeURIComponent(data.owner.discriminator)}`;
  return (
    <StatsViewContext.Provider value={{
      ...data,
      userId: selected.userId,
      displayName: selected.displayName,
      isOwn,
      detailHref: (type, id) => statsDetailHref(type, id, timeRange, sourceUserId, viewOwn),
      backHref: data.owner.userId !== data.viewer.userId ? friendHref : `/dashboard/${itemType}s`,
    }}>
      <div key={`${selected.userId}:${params.id}:${timeRange}`}>{children}</div>
    </StatsViewContext.Provider>
  );
}

export function StatsViewControls({ itemType, itemId, itemName }: {
  itemType: StatsItemType; itemId: string; itemName: string;
}) {
  const { viewer, owner, friends, isOwn, displayName } = useStatsView();
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const timeRange = parseTimeRange(search.get("time_range"), "medium_term");
  const switchView = () => {
    const next = new URLSearchParams(search.toString());
    if (isOwn) next.delete("view");
    else next.set("view", "me");
    router.push(`${pathname}?${next}`, { scroll: false });
  };

  return (
    <div className="mx-4 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 md:mx-6">
      <p className="text-sm font-medium">{isOwn ? "Viewing your stats" : `Viewing ${displayName}'s stats`}</p>
      <div className="flex flex-wrap gap-2">
        {owner.userId !== viewer.userId && (
          <Button variant="outline" size="sm" onClick={switchView}>
            {isOwn ? `View ${owner.displayName}'s history` : "View my history"}
          </Button>
        )}
        {friends.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setComparisonOpen(true)}>
            <Users className="size-4" /> Compare with friends
          </Button>
        )}
      </div>
      {friends.length > 0 && (
        <RankingComparison
          key={`${itemId}:${timeRange}`}
          open={comparisonOpen}
          onOpenChange={setComparisonOpen}
          itemId={itemId}
          itemType={itemType}
          itemName={itemName}
          timeRange={timeRange}
          viewer={viewer}
          friends={friends}
          initialFriendId={owner.userId}
        />
      )}
    </div>
  );
}
