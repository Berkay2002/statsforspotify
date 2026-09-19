import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArtworkCardLoading, HeroBannerLoading, PageHeaderLoading, TimeRangeTabsLoading } from "@/components/ui/loading-skeletons";

export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading overview" aria-busy="true" className="space-y-6">
      <PageHeaderLoading />
      <div className="space-y-8">
        <div className="flex flex-col gap-8 md:min-h-[calc(100svh-8rem)]">
          <TimeRangeTabsLoading />
          <HeroBannerLoading />
          <div className="grid grid-cols-1 gap-4 md:flex-1 md:grid-cols-3 md:[&>*]:min-h-72">
            {[1, 2, 3].map(index => <ArtworkCardLoading key={index} />)}
          </div>
        </div>
        <Separator />
        <div>
          <Skeleton className="mb-1 h-7 w-48 max-w-full" />
          <Skeleton className="mb-4 h-5 w-72 max-w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(index => (
              <div key={index} className={`rounded-3xl border bg-card p-6 ${index > 1 ? "hidden md:block" : ""}`}>
                <Skeleton className="mb-4 h-4 w-28 max-w-full" />
                <div className="space-y-3">
                  {[1, 2, 3].map(row => (
                    <div key={row} className="flex items-center gap-3">
                      <Skeleton className="size-16 shrink-0 rounded-2xl" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-5 w-32 max-w-full" />
                        <Skeleton className="h-3 w-16 max-w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 h-12 w-full rounded-3xl" />
        </div>
        <Separator />
        <div>
          <Skeleton className="mb-1 h-7 w-32 max-w-full" />
          <Skeleton className="mb-4 h-5 w-64 max-w-full" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map(index => <ArtworkCardLoading key={index} className="p-5 sm:p-6" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
