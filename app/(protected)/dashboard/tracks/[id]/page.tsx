"use client";

import Image from "next/image";
import { StatsViewProvider, StatsViewControls, useStatsView } from "@/components/detail/stats-view-context";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { PlaybackPreferenceDialog } from "@/components/playback-preference-dialog";
import { Play } from "lucide-react";

function formatDuration(durationMilliseconds: number): string {
  const minutes = Math.floor(durationMilliseconds / 60000);
  const seconds = Math.floor((durationMilliseconds % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function TrackDetailPage() {
  return <StatsViewProvider itemType="track"><TrackDetailPageContent /></StatsViewProvider>;
}

function TrackDetailPageContent() {
  const { userId, isOwn, displayName, detailHref } = useStatsView();
  const params = useParams();
  const searchParameters = useSearchParams();
  const trackId = params?.id as string;
  const timeRange = parseTimeRange(searchParameters.get("time_range"), "medium_term");
  const { play, playerState, isPWA, playbackPreference, openInSpotifyApp } = useSpotifyPlayer();
  const isMobile = useIsMobile();

  const [track, setTrack] = useState<{ id: string; name: string; album: { id: string; name: string; images: { url: string }[] }; artists: { name: string; id: string }[]; duration_ms: number } | null>(null);
  const [relatedTracks, setRelatedTracks] = useState<{ rank: number; id: string; name: string; imageUrl: string; subtitle: string; durationMs: number; popularity: number }[]>([]);
  const [tracksError, setTracksError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreferenceDialog, setShowPreferenceDialog] = useState(false);
  const [pendingPlayAction, setPendingPlayAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    async function loadTrackData() {
      try {
        setLoading(true);
        setTracksError(null);
        const [trackResponse, tracksResponse] = await Promise.all([
          fetch(`/api/spotify/tracks/${trackId}`),
          fetch(`/api/rankings/tracks?user_id=${userId}&time_range=${timeRange}`),
        ]);

        if (!trackResponse.ok) {
          notFound();
          return;
        }

        const trackData = await trackResponse.json();
        setTrack(trackData);

        if (!tracksResponse.ok) {
          setTracksError("Unable to load saved top tracks for this listener. Please try again later.");
        }
        if (tracksResponse.ok) {
          const tracksData = await tracksResponse.json();
          const related = tracksData
            .filter((t: { albumId: string; id: string }) => t.albumId === trackData.album.id && t.id !== trackData.id)
            .map((t: { rank: number; id: string; name: string; imageUrl: string; artistName: string; durationMs: number; popularity: number }) => ({
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
  }, [trackId, timeRange, userId]);

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
  const artistName = track.artists.map((artist) => artist.name).join(", ");
  const primaryArtistId = track.artists[0]?.id ?? "";

  const handlePlayTrack = () => {
    if (!playerState.isReady) return;

    const executePlay = () => {
      play(`spotify:track:${track.id}`);
    };

    // Check if we should show the preference dialog
    if (isPWA && isMobile && playbackPreference === null) {
      setPendingPlayAction(() => executePlay);
      setShowPreferenceDialog(true);
    } else if (playbackPreference === 'spotify-app') {
      // User prefers Spotify app - open the track
      openInSpotifyApp(`spotify:track:${track.id}`);
    } else {
      // Play in-app (default behavior)
      executePlay();
    }
  };

  return (
    <div className="space-y-0 -mt-4 md:-mt-6 -mx-4 md:-mx-6 pb-6">
      <TimeRangeQueryTabs
        value={timeRange}
        leading={<StatsViewControls itemType="track" itemId={trackId} itemName={track.name} />}
      />
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

        <div className="relative h-full flex flex-col justify-end px-4 md:px-6 pb-8">

          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white tracking-tight break-words">
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


      <div className="px-4 md:px-6 pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            className="rounded-full h-14 w-14 p-0"
            onClick={handlePlayTrack}
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
            <Link href={detailHref("album", track.album.id)}>View Album</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-8"
            asChild
          >
            <Link href={detailHref("artist", primaryArtistId)}>View Artist</Link>
          </Button>
        </div>
      </div>

      {tracksError && <p role="alert" className="px-4 pt-6 text-sm text-muted-foreground md:px-6">{tracksError}</p>}
      <TopTracksSection title="More from this Album" tracks={relatedTracks} detailHref={detailHref} />

      <div className="px-4 md:px-6 pt-8">
        <RankingHistoryLoader
          itemId={trackId}
          itemType="track"
          timeRange={timeRange}
          showTimeRangeSelect={false}
          userId={userId}
          ownerLabel={isOwn ? "Your" : `${displayName}'s`}
        />
      </div>

      {/* Playback Preference Dialog */}
      <PlaybackPreferenceDialog
        open={showPreferenceDialog}
        onClose={() => setShowPreferenceDialog(false)}
        trackUri={`spotify:track:${track.id}`}
        onPlayInApp={() => {
          if (pendingPlayAction) {
            pendingPlayAction();
          }
        }}
      />
    </div>
  );
}
