import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderLoading, TimeRangeTabsLoading } from "@/components/ui/loading-skeletons";

export default function AlbumsLoading() {
  return (
    <div role="status" aria-label="Loading albums" aria-busy="true" className="space-y-6">
      <PageHeaderLoading />

      {/* Tabs skeleton */}
      <div className="space-y-6">
        <TimeRangeTabsLoading />

        {/* List of albums */}
        <div className="space-y-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="bg-transparent rounded-md">
              <div className="p-3 px-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 flex flex-col items-center justify-center flex-shrink-0">
                    <Skeleton className="h-4 w-6 mb-0.5" />
                    <Skeleton className="h-7 w-7" />
                  </div>
                  <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0 overflow-hidden space-y-1.5">
                    <Skeleton className="h-5 w-48 max-w-full" />
                    <Skeleton className="h-[14px] w-72 max-w-full" />
                  </div>
                  <Skeleton className="h-[14px] w-24 flex-shrink-0 hidden sm:block" />
                  <Skeleton className="h-5 w-5 flex-shrink-0 mr-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
