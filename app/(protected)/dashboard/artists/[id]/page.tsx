import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopArtists } from "@/lib/spotify/api";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RankingChart } from "@/components/charts/ranking-chart";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { RankingHistory } from "@/lib/spotify/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ArtistDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  // Get current artist from Spotify
  const artists = await getTopArtists("medium_term", 50);
  const artist = artists.find((a) => a.id === id);

  if (!artist) {
    notFound();
  }

  // Get historical rankings from database
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let history: RankingHistory[] = [];
  
  if (user) {
    const { data: rankings } = await supabase
      .from("artist_rankings")
      .select("rank, created_at")
      .eq("user_id", user.id)
      .eq("artist_id", id)
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
          <Link href="/dashboard/artists">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{artist.name}</h1>
          <p className="text-muted-foreground">Artist Details</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Artist Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              {artist.imageUrl ? (
                <Image
                  src={artist.imageUrl}
                  alt={artist.name}
                  width={160}
                  height={160}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="h-40 w-40 rounded-full bg-muted" />
              )}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Badge variant="default" className="text-lg px-3 py-1">
                    #{artist.rank}
                  </Badge>
                </div>
                <h2 className="mt-3 text-2xl font-bold">{artist.name}</h2>
                <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                  {artist.genres.map((genre) => (
                    <Badge key={genre} variant="secondary">
                      {genre}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Popularity: {artist.popularity}/100
                  </p>
                </div>
                <Button className="mt-4" asChild>
                  <a
                    href={`https://open.spotify.com/artist/${artist.id}`}
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
        <RankingChart
          title="Ranking History"
          data={history}
        />
      </div>
    </div>
  );
}
