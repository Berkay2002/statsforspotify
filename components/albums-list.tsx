"use client";

import Image from "next/image";
import type { TimeRange } from "@/lib/spotify/types";
import { statsDetailHref } from "@/lib/stats/navigation";
import Link from "next/link";
import { SpotifyIcon } from "@/components/ui/spotify-icon";
import { InlineSparkline } from "@/components/charts/sparkline-loader";
import RankBadgeInline from "@/components/charts/rank-badge-inline";
import { TimeRangeList } from "@/components/time-range-list";
import { BLUR_DATA_URL } from "@/lib/constants";
import { SparklineInfo } from "@/components/charts/sparkline-info";

interface Album {
  id: string;
  name: string;
  rank: number;
  imageUrl: string | null;
  artistName: string;
  trackCount: number;
  previous_rank?: number | null;
}

interface AlbumsListProps {
  userId?: string;
  timeRange?: TimeRange;
  albumsByTimeRange: {
    short_term: Album[];
    medium_term: Album[];
    long_term: Album[];
  };
}

export function AlbumsList({ albumsByTimeRange, userId, timeRange }: AlbumsListProps) {
  return (
    <TimeRangeList
      itemsByTimeRange={albumsByTimeRange}
      itemType="album"
      userId={userId}
      timeRange={timeRange}
      className="w-full"
      tabsRightContent={<SparklineInfo />}
      renderItems={(albums, sparklines, loading, timeRange) => (
        <div className="space-y-2">
          {albums.map((album, index) => (
            <div key={album.id} className="bg-transparent transition-colors hover:bg-muted/30 rounded-md">
              <div className="p-3 px-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 flex flex-col items-center justify-center shrink-0">
                    <RankBadgeInline
                      currentRank={album.rank}
                      previousRank={album.previous_rank ?? null}
                      className="ml-0"
                    />
                    <span className="text-xl font-bold text-muted-foreground">
                      {album.rank}
                    </span>
                  </div>
                  <Link href={statsDetailHref("album", album.id, timeRange, userId)} className="flex items-center gap-3 flex-1 min-w-0">
                    {album.imageUrl ? (
                      <Image
                        src={album.imageUrl}
                        alt={album.name}
                        width={64}
                        height={64}
                        className="rounded-lg object-cover shrink-0"
                        loading={index < 10 ? "eager" : "lazy"}
                        priority={index < 5}
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL.SMALL}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-muted shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="truncate font-semibold text-base flex-1 min-w-0">
                          {album.name}
                        </p>
                        <div className="shrink-0">
                          <InlineSparkline itemId={album.id} sparklinesByItemId={sparklines} isLoading={loading} />
                        </div>
                      </div>
                      <p className="truncate text-sm text-muted-foreground max-w-75 sm:max-w-100 md:max-w-125">
                        {album.artistName}
                      </p>
                    </div>
                  </Link>
                  <span
                    className="text-sm text-muted-foreground shrink-0 hidden sm:block"
                    title="Tracks from this album in this listener's top tracks"
                  >
                    {album.trackCount} top tracks
                  </span>
                  <a
                    href={`https://open.spotify.com/album/${album.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1DB954] hover:text-[#1ed760] transition-colors p-2"
                    title="Open on Spotify"
                  >
                    <SpotifyIcon />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    />
  );
}
