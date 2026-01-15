"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { parseTimeRange } from "@/lib/spotify/time-range";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RankingHistoryLoader } from "@/components/charts/ranking-history-loader";
import { TopTracksSection } from "@/components/detail/top-tracks-section";
import { TimeRangeQueryTabs } from "@/components/time-range-query-tabs";
import { useSpotifyPlayer } from "@/lib/spotify/player-context";
import { ArrowLeft, Play } from "lucide-react";

export default function AlbumDetailPage() {
  const params = useParams();
  const searchParameters = useSearchParams();
  const albumId = params?.id as string;
  const timeRange = parseTimeRange(searchParameters.get("time_range"), "medium_term");
  const { play, playerState } = useSpotifyPlayer();

  const [album, setAlbum] = useState<any>(null);
  const [albumTracks, setAlbumTracks] = useState<any[]>([]);
  const [rankedAlbum, setRankedAlbum] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlbumData() {
      try {
        setLoading(true);
        const [albumResponse, tracksResponse] = await Promise.all([
          fetch(`/api/spotify/albums/${albumId}`),
          fetch(`/api/rankings/history?type=track&time_range=${timeRange}&limit=50`),
        ]);

        if (!albumResponse.ok) {
          notFound();
          return;
        }

        const albumData = await albumResponse.json();
        setAlbum(albumData);

        if (tracksResponse.ok) {
          const tracksData = await tracksResponse.json();
          const albumTracksList = tracksData
            .filter((t: any) => t.albumId === albumId)
            .map((t: any) => ({
              rank: t.rank,
              id: t.id,
              name: t.name,
              imageUrl: t.imageUrl,
              subtitle: t.artistName,
              durationMs: t.durationMs,
              popularity: t.popularity,
            }));
          setAlbumTracks(albumTracksList);
          
          // Calculate ranked album info
          if (albumTracksList.length > 0) {
            setRankedAlbum({ trackCount: albumTracksList.length });
          }
        }
      } catch (error) {
        console.error("Error loading album:", error);
      } finally {
        setLoading(false);
      }
    }

    if (albumId) {
      loadAlbumData();
    }
  }, [albumId, timeRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!album) {
    notFound();
    return null;
  }

  const imageUrl = album.images[1]?.url ?? album.images[0]?.url ?? null;
  const artistName = album.artists.map((artist: any) => artist.name).join(", ");
  const primaryArtistId = album.artists[0]?.id;

  return (
    <div className="space-y-0 -mt-6 -mx-6 pb-6">
      <div className="relative h-[500px] overflow-hidden">
        <div className="absolute inset-0">
          {imageUrl ? (
            <>
              <Image
                src={imageUrl}
                alt={album.name}
                fill
                className="object-cover object-center"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-background" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-muted to-background" />
          )}
        </div>

        <div className="relative h-full flex flex-col justify-end px-6 pb-8">
          <div className="absolute top-6 left-6">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              asChild
            >
              <Link href="/dashboard/albums">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          <div className="space-y-6">
            <h1 className="text-7xl font-bold text-white tracking-tight">
              {album.name}
            </h1>

            <div className="flex items-center gap-6 text-white text-base">
              <span className="font-semibold">{artistName}</span>
              <span className="text-white/60">•</span>
              {rankedAlbum?.trackCount ? (
                <span className="font-medium">
                  {rankedAlbum.trackCount}{" "}
                  {rankedAlbum.trackCount === 1 ? "track" : "tracks"} in your top 50
                </span>
              ) : (
                <span className="font-medium text-white/80">
                  Not in your top 50 for this time period
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            className="rounded-full h-14 w-14 p-0"
            onClick={() => play(undefined, `spotify:album:${album.id}`)}
            disabled={!playerState.isReady}
            aria-label="Play Album"
          >
            <Play className="h-6 w-6 fill-current" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-8"
            asChild
          >
            <Link href={`/dashboard/artists/${primaryArtistId}`}>View Artist</Link>
          </Button>
        </div>

        <TimeRangeQueryTabs value={timeRange} className="w-full sm:w-auto" />
      </div>

      <TopTracksSection title="My Top Tracks" tracks={albumTracks} />

      <div className="px-6 pt-8">
        <RankingHistoryLoader
          itemId={albumId}
          itemType="album"
          timeRange={timeRange}
          showTimeRangeSelect={false}
        />
      </div>
    </div>
  );
}
