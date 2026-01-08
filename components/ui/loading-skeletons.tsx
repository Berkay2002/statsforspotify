import { Skeleton } from "@/components/ui/skeleton";

interface PageHeaderLoadingProps {
  showSpotifyAttribution?: boolean;
}

export function PageHeaderLoading({ showSpotifyAttribution = true }: PageHeaderLoadingProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>
      {showSpotifyAttribution && <Skeleton className="h-8 w-32" />}
    </div>
  );
}

export function TimeRangeTabsLoading() {
  return (
    <div className="flex gap-2">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}
