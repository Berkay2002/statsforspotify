"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RankingHistoryLoader } from "@/components/charts/ranking-history-loader";
import { TimeRangeQueryTabs } from "@/components/time-range-query-tabs";
import { parseTimeRange } from "@/lib/spotify/time-range";
import { useSpotifyPlayer } from "@/lib/spotify/player-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { PlaybackPreferenceDialog } from "@/components/playback-preference-dialog";
import { ArrowLeft, Play, UserPlus } from "lucide-react";
import type { TimeRange } from "@/lib/spotify/types";

interface ArtistDetails {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
  followers: number;
  popularity: number;
}

interface ArtistStats {
  totalHoursListened: number;
  uniqueTracksCount: number;
  totalPlayCount: number;
}

interface Track {
  rank: number;
  id: string;
  name: string;
  imageUrl: string | null;
  albumName: string;
  durationMs: number;
  popularity: number;
}

export default function ArtistDetailPage() {
  const params = useParams();
  const searchParameters = useSearchParams();
  const artistId = params?.id as string;
  const timeRange: TimeRange = parseTimeRange(searchParameters.get("time_range"), "medium_term");
  const { play, playerState, isPWA, playbackPreference, openInSpotifyApp } = useSpotifyPlayer();
  const isMobile = useIsMobile();
  
  const [artist, setArtist] = useState<ArtistDetails | null>(null);
  const [stats, setStats] = useState<ArtistStats | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showPreferenceDialog, setShowPreferenceDialog] = useState(false);
  const [pendingPlayAction, setPendingPlayAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    async function loadArtistData() {
      try {
        setLoading(true);
        
        // Fetch artist details, stats, top tracks, and follow status in parallel
        const [detailsResponse, statsResponse, followResponse] = await Promise.all([
          fetch(`/api/artists/${artistId}`),
          fetch(`/api/artists/${artistId}/stats`),
          fetch(`/api/artists/${artistId}/follow`),
        ]);

        if (!detailsResponse.ok) throw new Error("Failed to load artist details");
        
        const artistDetails = (await detailsResponse.json()) as ArtistDetails;
        setArtist(artistDetails);

        if (statsResponse.ok) {
          const artistStats = (await statsResponse.json()) as ArtistStats;
          setStats(artistStats);
        }

        if (followResponse.ok) {
          const followStatus = (await followResponse.json()) as { isFollowing: boolean };
          setIsFollowing(followStatus.isFollowing);
        }
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    if (artistId) {
      loadArtistData();
    }
  }, [artistId]);

  useEffect(() => {
    let isCancelled = false;

    async function loadArtistTracks() {
      try {
        setTracksLoading(true);

        const tracksResponse = await fetch(
          `/api/artists/${artistId}/tracks?time_range=${timeRange}`
        );

        if (isCancelled) return;

        if (tracksResponse.ok) {
          const artistTopTracks = (await tracksResponse.json()) as Track[];
          setTracks(artistTopTracks);
        } else {
          setTracks([]);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          console.error("Error fetching artist tracks:", caughtError);
          setTracks([]);
        }
      } finally {
        if (!isCancelled) {
          setTracksLoading(false);
        }
      }
    }

    setShowAllTracks(false);

    if (artistId) {
      loadArtistTracks();
    }

    return () => {
      isCancelled = true;
    };
  }, [artistId, timeRange]);

  const formatDuration = (durationMilliseconds: number) => {
    const minutes = Math.floor(durationMilliseconds / 60000);
    const seconds = Math.floor((durationMilliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleFollowToggle = async () => {
    if (!artist || followLoading) return;

    try {
      setFollowLoading(true);
      
      const method = isFollowing ? "DELETE" : "PUT";
      const response = await fetch(`/api/artists/${artistId}/follow`, {
        method,
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isFollowing ? "unfollow" : "follow"} artist`);
      }

      setIsFollowing(!isFollowing);
    } catch (caughtError) {
      console.error("Error toggling follow:", caughtError);
      // Optionally show an error message to the user
    } finally {
      setFollowLoading(false);
    }
  };

  const displayedTracks = showAllTracks ? tracks : tracks.slice(0, 5);

  const handlePlayTopTracks = useCallback(() => {
    if (!playerState.isReady || tracks.length === 0) return;

    const executePlay = () => {
      // Get top 5 tracks (or fewer if less available) and convert to Spotify URIs
      const topTracksToPlay = tracks.slice(0, 5);
      const trackUris = topTracksToPlay.map(track => `spotify:track:${track.id}`);

      // Play the tracks using the uris parameter
      play(undefined, undefined, trackUris);
    };

    // Check if we should show the preference dialog
    if (isPWA && isMobile && playbackPreference === null) {
      setPendingPlayAction(() => executePlay);
      setShowPreferenceDialog(true);
    } else if (playbackPreference === 'spotify-app' && tracks.length > 0) {
      // User prefers Spotify app - open the artist URI
      openInSpotifyApp(`spotify:artist:${artistId}`);
    } else {
      // Play in-app (default behavior)
      executePlay();
    }
  }, [tracks, playerState.isReady, play, isPWA, isMobile, playbackPreference, openInSpotifyApp, artistId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-lg text-muted-foreground">
          {error || "Artist not found"}
        </p>
        <Button asChild>
          <Link href="/dashboard/artists">Back to Artists</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-0 -mt-4 md:-mt-6 -mx-4 md:-mx-6 pb-6">
      {/* Hero Section with Background */}
      <div className="relative h-[500px] overflow-hidden">
        {/* Background Image with Gradient Overlay */}
        <div className="absolute inset-0">
          {artist.imageUrl ? (
            <>
              <Image
                src={artist.imageUrl}
                alt={artist.name}
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

        {/* Content Overlay */}
        <div className="relative h-full flex flex-col justify-end px-4 md:px-6 pb-8">
          {/* Back Button */}
          <div className="absolute top-4 left-4 md:top-6 md:left-6">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" asChild>
              <Link href="/dashboard/artists">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Artist Name and Stats */}
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white tracking-tight break-words">
              {artist.name}
            </h1>
            
            {/* Stats Row - Always visible */}
            <div className="flex items-center gap-6 text-white text-base">
              {stats && stats.totalHoursListened > 0 ? (
                <>
                  <span className="font-semibold">
                    {stats.totalHoursListened.toFixed(1)} hours listened
                  </span>
                  <span className="text-white/60">•</span>
                  <span className="font-medium">
                    {stats.uniqueTracksCount} unique tracks
                  </span>
                </>
              ) : (
                <span className="font-medium text-white/80">
                  Start listening to see your stats
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons + Time Range */}
      <div className="px-4 md:px-6 pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            className="rounded-full h-14 w-14 p-0"
            onClick={handlePlayTopTracks}
            disabled={!playerState.isReady || tracks.length === 0 || tracksLoading}
            aria-label={tracks.length === 0 ? "No tracks available" : `Play Top ${Math.min(tracks.length, 5)} Tracks`}
            title={
              !playerState.isReady
                ? "Player not ready"
                : tracks.length === 0
                ? "No tracks from this artist in this time range"
                : `Play your top ${Math.min(tracks.length, 5)} track${Math.min(tracks.length, 5) === 1 ? "" : "s"} from ${artist.name}`
            }
          >
            <Play className="h-6 w-6 fill-current" />
          </Button>
          <Button
            variant={isFollowing ? "secondary" : "outline"}
            size="lg"
            className="rounded-full px-8"
            onClick={handleFollowToggle}
            disabled={followLoading}
          >
            {followLoading ? (
              <>Loading...</>
            ) : (
              <>
                <UserPlus className="h-5 w-5 mr-2" />
                {isFollowing ? "Following" : "Follow"}
              </>
            )}
          </Button>
        </div>

        <TimeRangeQueryTabs value={timeRange} className="w-full sm:w-auto" />
      </div>

      {/* My Top Tracks Section */}
      {(tracksLoading || tracks.length > 0) && (
        <div className="px-4 md:px-6 pt-8">
          <h2 className="text-2xl font-bold mb-6">My Top Tracks</h2>
          
          <div className="space-y-1">
            {tracksLoading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="p-5">
                    <div className="flex items-center gap-5">
                      <Skeleton className="h-6 w-10" />
                      <Skeleton className="h-16 w-16 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-5 w-36" />
                      </div>
                      <Skeleton className="hidden sm:block h-6 w-24" />
                      <Skeleton className="h-6 w-14" />
                    </div>
                  </div>
                ))
              : displayedTracks.map((track) => (
                  <div
                    key={track.id}
                    className="rounded-lg hover:bg-accent/50 transition-colors cursor-pointer bg-transparent"
                  >
                    <div className="p-5">
                      <div className="flex items-center gap-5">
                        <div className="w-10 text-center">
                          <span className="text-xl font-semibold text-foreground">
                            {track.rank}
                          </span>
                        </div>

                        {track.imageUrl ? (
                          <Image
                            src={track.imageUrl}
                            alt={track.name}
                            width={64}
                            height={64}
                            className="rounded object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded bg-muted" />
                        )}

                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/dashboard/tracks/${track.id}`}
                            className="hover:underline"
                          >
                            <p className="text-base font-semibold truncate">{track.name}</p>
                          </Link>
                          <p className="text-base text-muted-foreground truncate mt-1">
                            {track.albumName}
                          </p>
                        </div>

                        <Badge variant="secondary" className="hidden sm:inline-flex text-sm px-3 py-1">
                          {track.popularity}% popularity
                        </Badge>

                        <div className="text-base text-muted-foreground tabular-nums">
                          {formatDuration(track.durationMs)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
          </div>

          {/* See More Button */}
          {tracks.length > 5 && (
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => setShowAllTracks(!showAllTracks)}
              >
                {showAllTracks ? "Show Less" : `See More (${tracks.length - 5} more)`}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Genres */}
      {artist.genres.length > 0 && (
        <div className="px-4 md:px-6 pt-8">
          <h3 className="text-lg font-semibold mb-3">Genres</h3>
          <div className="flex flex-wrap gap-2">
            {artist.genres.map((genre) => (
              <Badge key={genre} variant="secondary" className="text-sm">
                {genre}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Ranking History */}
      <div className="px-4 md:px-6 pt-8">
        <RankingHistoryLoader
          itemId={artistId}
          itemType="artist"
          timeRange={timeRange}
          showTimeRangeSelect={false}
        />
      </div>

      {/* Playback Preference Dialog */}
      <PlaybackPreferenceDialog
        open={showPreferenceDialog}
        onClose={() => setShowPreferenceDialog(false)}
        trackUri={`spotify:artist:${artistId}`}
        onPlayInApp={() => {
          if (pendingPlayAction) {
            pendingPlayAction();
          }
        }}
      />
    </div>
  );
}
