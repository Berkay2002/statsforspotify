"use client";

import { useState, useCallback } from "react";
import type { CarouselApi } from "@/components/ui/carousel";

export function useCarouselDots() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const setApi = useCallback((api: CarouselApi) => {
    if (!api) return;

    setScrollSnaps(api.scrollSnapList());
    setSelectedIndex(api.selectedScrollSnap());

    api.on("select", () => {
      setSelectedIndex(api.selectedScrollSnap());
    });
    api.on("reInit", () => {
      setScrollSnaps(api.scrollSnapList());
      setSelectedIndex(api.selectedScrollSnap());
    });
  }, []);

  return { setApi, selectedIndex, scrollSnaps };
}
