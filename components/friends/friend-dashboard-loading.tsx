import { Skeleton } from "@/components/ui/skeleton";
import { ArtworkCardLoading, HeroBannerLoading, TimeRangeTabsLoading } from "@/components/ui/loading-skeletons";
import styles from "./friend-dashboard.module.css";

export function FriendDashboardLoading() {
  return (
    <div role="status" aria-label="Loading friend overview" aria-busy="true" className={`flex flex-col gap-5 ${styles.overview}`}>
      <div className="shrink-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <Skeleton className="size-16 shrink-0 rounded-2xl" />
            <Skeleton className="h-9 w-36 max-w-full" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-36 rounded-full" />
            <Skeleton className="h-9 w-36 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="-mx-1 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 px-1 py-3">
          <TimeRangeTabsLoading sections />
          <TimeRangeTabsLoading />
        </div>
        <div className="min-h-0 min-w-0 flex-1">
          <div className={`grid gap-4 ${styles.overviewGrid}`}>
            <HeroBannerLoading compact action />
            <div className="grid min-h-0 gap-4 md:grid-cols-2">
              <ArtworkCardLoading action className={`p-5 ${styles.highlightCard}`} />
              <ArtworkCardLoading action className={`p-5 ${styles.highlightCard}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
