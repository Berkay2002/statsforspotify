"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import type { CarouselApi } from "@/components/ui/carousel";

export function useCarouselDots() {
  const [api, setApi] = useState<CarouselApi>();

  const subscribe = useCallback(
    (callback: () => void) => {
      if (!api) return () => {};
      api.on("select", callback);
      api.on("reInit", callback);
      return () => {
        api.off("select", callback);
        api.off("reInit", callback);
      };
    },
    [api]
  );

  const selectedIndex = useSyncExternalStore(
    subscribe,
    () => api?.selectedScrollSnap() ?? 0,
    () => 0
  );

  const scrollSnaps = useSyncExternalStore(
    subscribe,
    () => api?.scrollSnapList() ?? [],
    () => [] as number[]
  );

  return { setApi, selectedIndex, scrollSnaps };
}
