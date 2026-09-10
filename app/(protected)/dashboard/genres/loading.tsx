import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderLoading, TimeRangeTabsLoading } from "@/components/ui/loading-skeletons";

export default function GenresLoading() {
  return (
    <div role="status" aria-label="Loading genres" aria-busy="true" className="space-y-8">
      <PageHeaderLoading />
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TimeRangeTabsLoading />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex min-h-80 min-w-0 flex-col justify-between rounded-3xl bg-muted/35 p-6">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-3 pt-16">
                <Skeleton className="h-9 w-40 max-w-full" />
                <Skeleton className="h-5 w-full" />
                <div className="flex gap-1.5 pt-2">
                  {[1, 2, 3].map(dot => <Skeleton key={dot} className="h-1 w-5 rounded-full" />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
