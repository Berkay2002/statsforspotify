import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeaderLoading, TimeRangeTabsLoading } from "@/components/ui/loading-skeletons";

export default function AlbumsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderLoading showSpotifyAttribution={false} />

      {/* Tabs skeleton */}
      <div className="space-y-6">
        <TimeRangeTabsLoading />

        {/* Grid of album cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="transition-colors hover:bg-muted/50">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="self-start flex items-center gap-2">
                    <Skeleton className="h-[28px] w-6" />
                    <Skeleton className="h-4 w-6" />
                  </div>
                  <Skeleton className="h-[120px] w-[120px] rounded-lg shadow-md" />
                  <div className="mt-3 w-full space-y-1.5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-[14px] w-3/4 mx-auto" />
                    <Skeleton className="h-[22px] w-32 mx-auto mt-2 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
