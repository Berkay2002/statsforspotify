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

function formatDuration(durationMilliseconds: number): string {
  const minutes = Math.floor(durationMilliseconds / 60000);
  const seconds = Math.floor((durationMilliseconds % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function TrackDetailPage() {
  const params = useParams();
  const searchParameters = useSearchParams();
  const trackId = params?.id as string;
  const timeRange = parseTimeRange(searchParameters.get("time_range"), "medium_term");
  const { play, playerState } = useSpotifyPlayer();

  const [track, setTrack] = useState<any>(null);
  const [relatedTracks, setRelatedTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrackData() {
      try {
        setLoading(true);
        const [trackResponse, tracksResponse] = await Promise.all([
          fetch(`/api/spotify/tracks/${trackId}`),
          fetch(`/api/rankings/history?type=track&time_range=${timeRange}&limit=50`),
        ]);

        if (!trackResponse.ok) {
          notFound();
          return;
        }

        const trackData = await trackResponse.json();
        setTrack(trackData);

        if (tracksResponse.ok) {
          const tracksData = await tracksResponse.json();
          const related = tracksData
            .filter((t: any) => t.albumId === trackData.album.id && t.id !== trackData.id)
            .map((t: any) => ({
              rank: t.rank,
              id: t.id,
              name: t.name,
              imageUrl: t.imageUrl,
              subtitle: t.artistName,
              durationMs: t.durationMs,
              popularity: t.popularity,
            }));
          setRelatedTracks(related);
        }
      } catch (error) {
        console.error("Error loading track:", error);
      } finally {
        setLoading(false);
      }
    }

    if (trackId) {
      loadTrackData();
    }
  }, [trackId, timeRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!track) {
    notFound();
    return null;
  }

  const imageUrl = track.album.images[1]?.url ?? track.album.images[0]?.url ?? null;
  const artistName = track.artists.map((artist: any) => artist.name).join(", ");
  const primaryArtistId = track.artists[0]?.id;

  return (
    <div className="space-y-0 -mt-6 -mx-6 pb-6">
      <div className="relative h-[500px] overflow-hidden">
        <div className="absolute inset-0">
          {imageUrl ? (
            <>
              <Image
                src={imageUrl}
                alt={track.name}
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
              <Link href="/dashboard/tracks">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          <div className="space-y-6">
            <h1 className="text-7xl font-bold text-white tracking-tight">
              {track.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-white text-base">
              <span className="font-semibold">{artistName}</span>
              <span className="text-white/60">•</span>
              <span className="font-medium">{track.album.name}</span>
              <span className="text-white/60">•</span>
              <span className="font-medium tabular-nums">
                {formatDuration(track.duration_ms)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            className="rounded-full h-14 w-14 p-0"
            onClick={() => play(`spotify:track:${track.id}`)}
            disabled={!playerState.isReady}
            aria-label="Play Track"
          >
            <Play className="h-6 w-6 fill-current" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-8"
            asChild
          >
            <Link href={`/dashboard/albums/${track.album.id}`}>View Album</Link>
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

      <TopTracksSection title="More from this Album" tracks={relatedTracks} />

      <div className="px-6 pt-8">
        <RankingHistoryLoader
          itemId={trackId}
          itemType="track"
          timeRange={timeRange}
          showTimeRangeSelect={false}
        />
      </div>
    </div>
  );
}
