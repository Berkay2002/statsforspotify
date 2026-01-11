import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopTracks } from "@/lib/spotify/api";
import { Button } from "@/components/ui/button";
import { RankingHistoryLoader } from "@/components/charts/ranking-history-loader";
import { TopTracksSection } from "@/components/detail/top-tracks-section";
import { ArrowLeft, Play } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDuration(durationMilliseconds: number): string {
  const minutes = Math.floor(durationMilliseconds / 60000);
  const seconds = Math.floor((durationMilliseconds % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default async function TrackDetailPage({ params }: PageProps) {
  const { id: trackId } = await params;

  const tracks = await getTopTracks("medium_term", 50);
  const track = tracks.find((trackItem) => trackItem.id === trackId);

  if (!track) {
    notFound();
  }

  const relatedTracks = tracks
    .filter((trackItem) => trackItem.albumId === track.albumId && trackItem.id !== track.id)
    .map((trackItem) => ({
      rank: trackItem.rank,
      id: trackItem.id,
      name: trackItem.name,
      imageUrl: trackItem.imageUrl,
      subtitle: trackItem.artistName,
      durationMs: trackItem.durationMs,
      popularity: trackItem.popularity,
    }));

  return (
    <div className="space-y-0 -mt-6 -mx-6 pb-6">
      <div className="relative h-[500px] overflow-hidden">
        <div className="absolute inset-0">
          {track.imageUrl ? (
            <>
              <Image
                src={track.imageUrl}
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
              <span className="font-semibold">{track.artistName}</span>
              <span className="text-white/60">•</span>
              <span className="font-medium">{track.albumName}</span>
              <span className="text-white/60">•</span>
              <span className="font-medium tabular-nums">
                {formatDuration(track.durationMs)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pt-6 flex items-center gap-4">
        <Button size="lg" className="rounded-full h-14 w-14 p-0" asChild>
          <a
            href={`https://open.spotify.com/track/${track.id}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Play on Spotify"
          >
            <Play className="h-6 w-6 fill-current" />
          </a>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="rounded-full px-8"
          asChild
        >
          <Link href={`/dashboard/albums/${track.albumId}`}>View Album</Link>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="rounded-full px-8"
          asChild
        >
          <Link href={`/dashboard/artists/${track.artistId}`}>View Artist</Link>
        </Button>
      </div>

      <TopTracksSection title="More from this Album" tracks={relatedTracks} />

      <div className="px-6 pt-8">
        <RankingHistoryLoader itemId={trackId} itemType="track" />
      </div>
    </div>
  );
}
