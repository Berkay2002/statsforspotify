"use client";

import Image from "next/image";
import type { TimeRange } from "@/lib/spotify/types";
import { statsDetailHref } from "@/lib/stats/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { InlineSparkline } from "@/components/charts/sparkline-loader";
import RankBadgeInline from "@/components/charts/rank-badge-inline";
import { TimeRangeList } from "@/components/time-range-list";
import { BLUR_DATA_URL } from "@/lib/constants";
import { SparklineInfo } from "@/components/charts/sparkline-info";

interface Artist {
  id: string;
  name: string;
  rank: number;
  imageUrl: string | null;
  genres: string[];
  previous_rank?: number | null;
}

interface ArtistsListProps {
  userId?: string;
  timeRange?: TimeRange;
  artistsByTimeRange: {
    short_term: Artist[];
    medium_term: Artist[];
    long_term: Artist[];
  };
}

export function ArtistsList({ artistsByTimeRange, userId, timeRange }: ArtistsListProps) {
  return (
    <TimeRangeList
      itemsByTimeRange={artistsByTimeRange}
      itemType="artist"
      userId={userId}
      timeRange={timeRange}
      className="w-full"
      tabsRightContent={<SparklineInfo />}
      renderItems={(artists, sparklines, loading, timeRange) => (
        <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {artists.map((artist, index) => (
            <Card key={artist.id} className="group overflow-hidden transition-all hover:shadow-lg flex flex-col p-0">
              <Link href={statsDetailHref("artist", artist.id, timeRange, userId)} className="relative h-32 sm:h-64 w-full shrink-0 block">
                {artist.imageUrl ? (
                  <>
                    <Image
                      src={artist.imageUrl}
                      alt={artist.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      loading={index < 8 ? "eager" : "lazy"}
                      priority={index < 4}
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL.MEDIUM}
                    />
                    <div className="absolute inset-0 bg-linear-to-b from-transparent from-30% via-card/40 via-60% to-card" />
                  </>
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
              </Link>
              <CardContent className="px-4 pt-0 pb-1 flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-bold text-muted-foreground shrink-0">
                    {artist.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <Link href={statsDetailHref("artist", artist.id, timeRange, userId)}>
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="truncate font-semibold text-lg flex-1 min-w-0">
                          {artist.name}
                        </p>
                        <div className="hidden sm:block shrink-0">
                          <InlineSparkline itemId={artist.id} sparklinesByItemId={sparklines} isLoading={loading} />
                        </div>
                      </div>
                    </Link>
                  </div>
                  <RankBadgeInline
                    currentRank={artist.rank}
                    previousRank={artist.previous_rank ?? null}
                    className="ml-0"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    />
  );
}
