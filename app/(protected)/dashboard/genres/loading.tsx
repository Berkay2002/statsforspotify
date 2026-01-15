import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderLoading, TimeRangeTabsLoading } from "@/components/ui/loading-skeletons";

export default function GenresLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderLoading />

      {/* Tabs skeleton */}
      <div className="space-y-6">
        <TimeRangeTabsLoading />

        {/* List of genres */}
        <div className="space-y-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="rounded-md">
              <div className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
