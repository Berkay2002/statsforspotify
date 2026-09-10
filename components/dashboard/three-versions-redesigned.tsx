"use client";

import Image from "next/image";
import { type ThreeVersionsRecap } from "@/components/recaps/three-versions";
import {
  type RecapTimeRange,
  recapTimeRanges,
  recapTimeRangeLabels,
} from "@/components/recaps/shared";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { useCarouselDots } from "@/components/dashboard/use-carousel-dots";

type RankedRecapItem = {
  id: string;
  name: string;
  image_url: string | null;
  rank: number;
};

type RankedShiftItem = {
  id: string;
  name: string;
  image_url: string | null;
  short_rank: number;
  long_rank: number;
  delta: number;
};

function getLabel(
  itemId: string,
  constants: string[],
  uniqueShort: string[],
  uniqueMedium: string[],
  uniqueLong: string[],
  range: RecapTimeRange
): { text: string; isNew: boolean } {
  if (constants.includes(itemId)) return { text: "constant", isNew: false };
  if (range === "short_term" && uniqueShort.includes(itemId))
    return { text: "NEW", isNew: true };
  if (range === "medium_term" && uniqueMedium.includes(itemId))
    return { text: "unique", isNew: false };
  if (range === "long_term" && uniqueLong.includes(itemId))
    return { text: "unique", isNew: false };
  return { text: "", isNew: false };
}

function TimeRangePanel({
  range,
  items,
  recap,
}: {
  range: RecapTimeRange;
  items: RankedRecapItem[];
  recap: ThreeVersionsRecap;
}) {
  const { constants, unique_short, unique_medium, unique_long } = recap.artists;

  return (
    <div className="bg-card rounded-3xl border p-6">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
        {recapTimeRangeLabels[range]}
      </p>
      <div className="flex flex-col gap-3">
        {items.slice(0, 3).map((item) => {
          const label = getLabel(
            item.id, constants, unique_short, unique_medium, unique_long, range
          );
          return (
            <div key={item.id} className="flex items-center gap-3">
              {item.image_url ? (
                <Image src={item.image_url} alt={item.name} width={64} height={64}
                  className="rounded-2xl size-16 object-cover flex-shrink-0" />
              ) : (
                <div className="size-11 rounded-md bg-muted flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-base font-medium truncate">{item.name}</p>
                {label.text && (
                  <p className={`text-xs ${label.isNew ? "text-primary" : "text-muted-foreground"}`}>
                    {label.text}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BiggestShiftCallout({ shifts }: { shifts: RankedShiftItem[] }) {
  if (shifts.length === 0) return null;
  const biggest = shifts[0];

  return (
    <div className="flex items-center gap-2 flex-wrap px-4 py-3 bg-muted border rounded-3xl text-sm">
      <span className="text-muted-foreground">Biggest shift:</span>
      {biggest.image_url ? (
        <Image src={biggest.image_url} alt={biggest.name} width={24} height={24}
          className="rounded w-6 h-6 object-cover" />
      ) : (
        <div className="w-6 h-6 rounded bg-muted" />
      )}
      <span className="font-medium">{biggest.name}</span>
      <span className="text-muted-foreground">went from</span>
      <span className="text-muted-foreground font-medium">#{biggest.long_rank} all-time</span>
      <span className="text-muted-foreground">to</span>
      <span className="text-primary font-semibold">#{biggest.short_rank} recent</span>
    </div>
  );
}

export function ThreeVersionsRedesigned({
  recap, hasSnapshots,
}: {
  recap: ThreeVersionsRecap | null;
  hasSnapshots: boolean;
}) {
  if (!hasSnapshots || !recap) {
    return (
      <div>
        <h3 className="text-lg font-bold">Three Versions of You</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          How your taste shifts across time ranges
        </p>
        <div className="bg-card rounded-3xl border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Collecting your first snapshot… check back tomorrow
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-bold">Three Versions of You</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        How your taste shifts across time ranges
      </p>

      {/* Desktop: 3-column grid */}
      <div className="hidden md:grid md:grid-cols-3 gap-3 mb-3">
        {recapTimeRanges.map((range) => (
          <TimeRangePanel key={range} range={range} items={recap.artists[range]} recap={recap} />
        ))}
      </div>

      {/* Mobile: carousel */}
      <div className="md:hidden mb-3">
        <ThreeVersionsCarousel recap={recap} />
      </div>

      <BiggestShiftCallout shifts={recap.artists.biggest_shift_long_vs_short} />
    </div>
  );
}

function ThreeVersionsCarousel({ recap }: { recap: ThreeVersionsRecap }) {
  const { setApi, selectedIndex, scrollSnaps } = useCarouselDots();

  return (
    <div>
      <Carousel setApi={setApi} opts={{ align: "start" }}>
        <CarouselContent>
          {recapTimeRanges.map((range) => (
            <CarouselItem key={range}>
              <TimeRangePanel range={range} items={recap.artists[range]} recap={recap} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="flex justify-center gap-1.5 mt-3">
        {scrollSnaps.map((_, index) => (
          <div key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === selectedIndex ? "bg-foreground" : "bg-muted-foreground/30"
            }`} />
        ))}
      </div>
    </div>
  );
}
