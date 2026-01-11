import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopAlbums, getTopTracks } from "@/lib/spotify/api";
import { Button } from "@/components/ui/button";
import { RankingHistoryLoader } from "@/components/charts/ranking-history-loader";
import { TopTracksSection } from "@/components/detail/top-tracks-section";
import { ArrowLeft, Play } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AlbumDetailPage({ params }: PageProps) {
  const { id: albumId } = await params;

  const tracks = await getTopTracks("medium_term", 50);
  const albums = await getTopAlbums("medium_term", 50, tracks);
  
  const album = albums.find((albumItem) => albumItem.id === albumId);

  if (!album) {
    notFound();
  }

  const albumTracks = tracks
    .filter((track) => track.albumId === albumId)
    .map((track) => ({
      rank: track.rank,
      id: track.id,
      name: track.name,
      imageUrl: track.imageUrl,
      subtitle: track.artistName,
      durationMs: track.durationMs,
      popularity: track.popularity,
    }));

  return (
    <div className="space-y-0 -mt-6 -mx-6 pb-6">
      <div className="relative h-[500px] overflow-hidden">
        <div className="absolute inset-0">
          {album.imageUrl ? (
            <>
              <Image
                src={album.imageUrl}
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
              <span className="font-semibold">{album.artistName}</span>
              <span className="text-white/60">•</span>
              <span className="font-medium">
                {album.trackCount} {album.trackCount === 1 ? "track" : "tracks"}{" "}
                in your top 50
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pt-6 flex items-center gap-4">
        <Button size="lg" className="rounded-full h-14 w-14 p-0" asChild>
          <a
            href={`https://open.spotify.com/album/${album.id}`}
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
          <Link href={`/dashboard/artists/${album.artistId}`}>View Artist</Link>
        </Button>
      </div>

      <TopTracksSection title="My Top Tracks" tracks={albumTracks} />

      <div className="px-6 pt-8">
        <RankingHistoryLoader itemId={albumId} itemType="album" />
      </div>
    </div>
  );
}
