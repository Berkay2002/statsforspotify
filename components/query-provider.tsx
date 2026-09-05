"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { clearSparklinesCache, SPARKLINE_CACHE_INVALIDATION_EVENT_NAME } from "@/components/charts/sparkline-cache";
import { useEffect, useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    let previousUserId: string | null | undefined;
    const { data: { subscription } } = createClient().auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null;
      if (previousUserId !== userId) {
        previousUserId = userId;
        queryClient.clear();
        clearSparklinesCache();
        window.dispatchEvent(new Event(SPARKLINE_CACHE_INVALIDATION_EVENT_NAME));
      }
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
