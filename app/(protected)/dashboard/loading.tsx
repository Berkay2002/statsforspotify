import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>

      <Skeleton className="h-10 w-80" />

      <div className="flex flex-col md:flex-row gap-5 items-center md:items-center">
        <Skeleton className="w-[120px] h-[120px] rounded-lg" />
        <div className="text-center md:text-left">
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-xl border p-4">
            <Skeleton className="h-3 w-20 mb-3" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded" />
              <div>
                <Skeleton className="h-4 w-28 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t" />

      <div>
        <Skeleton className="h-6 w-44 mb-1" />
        <Skeleton className="h-4 w-64 mb-4" />
        <div className="hidden md:grid md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border p-5">
              <Skeleton className="h-3 w-24 mb-4" />
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-3 mb-3">
                  <Skeleton className="w-9 h-9 rounded-md" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t" />

      <div>
        <Skeleton className="h-6 w-28 mb-1" />
        <Skeleton className="h-4 w-56 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-xl border p-5 text-center">
              <Skeleton className="h-9 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-20 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
