import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeaderLoading, TimeRangeTabsLoading } from "@/components/ui/loading-skeletons";

export default function ArtistsLoading() {
  return (
    <div role="status" aria-label="Loading artists" aria-busy="true" className="space-y-6">
      <PageHeaderLoading />

      {/* Tabs skeleton */}
      <div className="space-y-6">
        <TimeRangeTabsLoading />

        {/* Grid of artist cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="group overflow-hidden transition-all hover:shadow-lg flex flex-col p-0">
              <Skeleton className="h-32 sm:h-64 w-full rounded-none" />
              <CardContent className="px-4 pt-0 pb-1 flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Skeleton className="h-8 w-6 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-[28px] w-full" />
                  </div>
                  <Skeleton className="h-4 w-6" />
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
