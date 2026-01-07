import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopAlbums, getTopTracks } from "@/lib/spotify/api";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RankingChart } from "@/components/charts/ranking-chart";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { RankingHistory } from "@/lib/spotify/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AlbumDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Get albums and tracks
  const [albums, tracks] = await Promise.all([
    getTopAlbums("medium_term", 50),
    getTopTracks("medium_term", 50),
  ]);
  
  const album = albums.find((a) => a.id === id);

  if (!album) {
    notFound();
  }

  // Get tracks from this album that are in user's top tracks
  const albumTracks = tracks.filter((t) => t.albumId === id);

  // Get historical rankings from database
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let history: RankingHistory[] = [];

  if (user) {
    const { data: rankings } = await supabase
      .from("album_rankings")
      .select("rank, created_at")
      .eq("user_id", user.id)
      .eq("album_id", id)
      .order("created_at", { ascending: true });

    if (rankings) {
      history = rankings.map((r) => ({
        date: r.created_at,
        rank: r.rank,
      }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/albums">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{album.name}</h1>
          <p className="text-muted-foreground">Album Details</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Album Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              {album.imageUrl ? (
                <Image
                  src={album.imageUrl}
                  alt={album.name}
                  width={180}
                  height={180}
                  className="rounded-lg object-cover shadow-lg"
                />
              ) : (
                <div className="h-[180px] w-[180px] rounded-lg bg-muted" />
              )}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Badge variant="default" className="text-lg px-3 py-1">
                    #{album.rank}
                  </Badge>
                </div>
                <h2 className="mt-3 text-2xl font-bold">{album.name}</h2>
                <p className="mt-1 text-lg text-muted-foreground">
                  {album.artistName}
                </p>
                <div className="mt-3">
                  <Badge variant="secondary">
                    {album.trackCount} {album.trackCount === 1 ? "track" : "tracks"} in your top 50
                  </Badge>
                </div>
                <Button className="mt-4" asChild>
                  <a
                    href={`https://open.spotify.com/album/${album.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Spotify
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ranking History Chart */}
        <RankingChart title="Ranking History" data={history} />
      </div>

      {/* Tracks from this album in user's top tracks */}
      {albumTracks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Top Tracks from this Album</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {albumTracks.map((track) => (
                <Link
                  key={track.id}
                  href={`/dashboard/tracks/${track.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <Badge variant="outline">#{track.rank}</Badge>
                  <span className="font-medium">{track.name}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
