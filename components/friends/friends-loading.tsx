import { Skeleton } from "@/components/ui/skeleton";

export function FriendCardsLoading() {
  return (
    <div role="status" aria-label="Loading friends" aria-busy="true" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map(index => (
        <div key={index} className="flex min-h-96 min-w-0 flex-col justify-end rounded-3xl bg-muted/35 p-6 pt-48">
          <Skeleton className="h-8 w-40 max-w-full" />
          <Skeleton className="mt-1 h-4 w-12" />
          <Skeleton className="mt-5 h-4 w-36 max-w-full" />
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Skeleton className="h-11 rounded-full" />
            <Skeleton className="h-11 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FriendRowLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className="flex flex-wrap items-center gap-4 rounded-2xl border p-4">
      <Skeleton className="size-14 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-6 w-40 max-w-full" />
        <Skeleton className="h-4 w-24 max-w-full" />
      </div>
      <div className="flex gap-2 max-sm:w-full">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function FriendsPageLoading() {
  return (
    <div role="status" aria-label="Loading friends page" aria-busy="true" className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <Skeleton className="mb-3 h-4 w-36 max-w-full" />
          <Skeleton className="h-10 w-40 max-w-full" />
          <Skeleton className="mt-3 h-6 w-96 max-w-full" />
        </div>
      </div>
      <div className="rounded-3xl border bg-card p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <Skeleton className="h-7 w-36 max-w-full" />
            <Skeleton className="mt-1 h-5 w-64 max-w-full" />
          </div>
          <Skeleton className="h-12 w-full rounded-full lg:max-w-md" />
        </div>
      </div>
      <div className="space-y-6">
        <div aria-hidden="true" className="flex h-11 w-72 max-w-full gap-1 rounded-full bg-muted/50 p-1">
          <Skeleton className="h-9 min-w-0 flex-1 rounded-full" />
          <Skeleton className="h-9 min-w-0 flex-1 rounded-full" />
        </div>
        <FriendCardsLoading />
      </div>
    </div>
  );
}
