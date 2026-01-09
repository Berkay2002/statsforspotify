"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineSparkline } from "@/components/charts/sparkline-loader";
import RankBadgeInline from "@/components/charts/rank-badge-inline";
import { TimeRangeList } from "@/components/time-range-list";
import { BLUR_DATA_URL } from "@/lib/constants";

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
  albumsByTimeRange: {
    short_term: Album[];
    medium_term: Album[];
    long_term: Album[];
  };
}

export function AlbumsList({ albumsByTimeRange }: AlbumsListProps) {
  return (
    <TimeRangeList
      itemsByTimeRange={albumsByTimeRange}
      itemType="album"
      className="w-full"
      renderItems={(albums, sparklines, loading) => (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {albums.map((album, index) => (
            <Link key={album.id} href={`/dashboard/albums/${album.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="self-start flex items-center gap-2">
                      <span className="text-lg font-bold text-muted-foreground">
                        {album.rank}
                      </span>
                      <InlineSparkline itemId={album.id} sparklines={sparklines} loading={loading} />
                    </div>
                    {album.imageUrl ? (
                      <Image
                        src={album.imageUrl}
                        alt={album.name}
                        width={120}
                        height={120}
                        className="rounded-lg object-cover shadow-md"
                        sizes="120px"
                        loading={index < 8 ? "eager" : "lazy"}
                        priority={index < 4}
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL.LARGE}
                      />
                    ) : (
                      <div className="h-30 w-30 rounded-lg bg-muted" />
                    )}
                    <div className="mt-3 w-full">
                      <p className="truncate font-semibold">
                        {album.name}
                        <RankBadgeInline currentRank={album.rank} previousRank={album.previous_rank ?? null} />
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {album.artistName}
                      </p>
                      <Badge variant="secondary" className="mt-2">
                        {album.trackCount} {album.trackCount === 1 ? "track" : "tracks"} in your top
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    />
  );
}
