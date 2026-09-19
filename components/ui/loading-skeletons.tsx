import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageHeaderLoadingProps {
  showSpotifyAttribution?: boolean;
  attributionOnMobile?: boolean;
}

export function PageHeaderLoading({ showSpotifyAttribution = true, attributionOnMobile = false }: PageHeaderLoadingProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <Skeleton className="mb-2 h-7 w-40 max-w-full" />
        <Skeleton className="h-5 w-64 max-w-full" />
      </div>
      {showSpotifyAttribution && <Skeleton className={cn("h-5 w-36 shrink-0", !attributionOnMobile && "hidden md:block")} />}
    </div>
  );
}

export function TimeRangeTabsLoading({ sections = false }: { sections?: boolean }) {
  return (
    <div aria-hidden="true" className={cn("glass flex h-11 max-w-full items-center gap-1 rounded-full p-1", sections ? "w-full sm:w-84" : "w-84")}>
      {Array.from({ length: sections ? 4 : 3 }, (_, index) => (
        <Skeleton key={index} className={cn("h-9 min-w-0 flex-1 rounded-full", index > 0 && "bg-muted/40")} />
      ))}
    </div>
  );
}

export function HeroBannerLoading({ compact = false, action = false }: { compact?: boolean; action?: boolean }) {
  return (
    <article aria-hidden="true" className={cn("relative flex items-end overflow-hidden rounded-3xl bg-muted/35 p-7 sm:items-center sm:p-10", compact ? "min-h-64" : "min-h-80 sm:min-h-88 lg:min-h-100")}>
      <Skeleton className={cn("absolute inset-y-0 right-0 h-full rounded-none opacity-60 [mask-image:linear-gradient(to_right,transparent,black)]", compact ? "aspect-square w-auto" : "w-full sm:w-88 lg:w-100")} />
      <div className="relative w-full min-w-0 space-y-3 sm:max-w-[55%]">
        <Skeleton className="h-4 w-28 max-w-full" />
        <Skeleton className="h-10 w-80 max-w-full sm:h-12" />
        {action ? <Skeleton className="mt-4 h-10 w-40 max-w-full rounded-full" /> : <Skeleton className="h-5 w-32 max-w-full" />}
      </div>
    </article>
  );
}

export function ArtworkCardLoading({ className, action = false }: { className?: string; action?: boolean }) {
  return (
    <article aria-hidden="true" className={cn("flex min-h-60 min-w-0 flex-col justify-between gap-5 overflow-hidden rounded-3xl bg-muted/35 p-6", className)}>
      <Skeleton className="h-4 w-24 max-w-full" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-5 w-36 max-w-full" />
        {action && <Skeleton className="mt-3 h-10 w-40 max-w-full rounded-full" />}
      </div>
    </article>
  );
}
