import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopTracks } from "@/lib/spotify/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RankingHistoryLoader } from "@/components/charts/ranking-history-loader";
import { ArrowLeft, ExternalLink, Clock } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDuration(durationMilliseconds: number): string {
  const minutes = Math.floor(durationMilliseconds / 60000);
  const seconds = Math.floor((durationMilliseconds % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default async function TrackDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Get current track from Spotify
  const tracks = await getTopTracks("medium_term", 50);
  const track = tracks.find((trackItem) => trackItem.id === id);

  if (!track) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/tracks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{track.name}</h1>
          <p className="text-muted-foreground">Track Details</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Track Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              {track.imageUrl ? (
                <Image
                  src={track.imageUrl}
                  alt={track.name}
                  width={160}
                  height={160}
                  className="rounded-lg object-cover shadow-lg"
                />
              ) : (
                <div className="h-40 w-40 rounded-lg bg-muted" />
              )}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Badge variant="default" className="text-lg px-3 py-1">
                    #{track.rank}
                  </Badge>
                </div>
                <h2 className="mt-3 text-2xl font-bold">{track.name}</h2>
                <p className="mt-1 text-lg text-muted-foreground">
                  {track.artistName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {track.albumName}
                </p>
                <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground sm:justify-start">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(track.durationMs)}
                  </span>
                  <span>Popularity: {track.popularity}/100</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <Button asChild>
                    <a
                      href={`https://open.spotify.com/track/${track.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open in Spotify
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/dashboard/albums/${track.albumId}`}>
                      View Album
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ranking History Chart */}
        <RankingHistoryLoader itemId={id} itemType="track" />
      </div>
    </div>
  );
}
