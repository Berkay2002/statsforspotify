import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAlbumDetails, getTopAlbums, getTopTracks } from "@/lib/spotify/api";
import { parseTimeRange } from "@/lib/spotify/time-range";
import { Button } from "@/components/ui/button";
import { RankingHistoryLoader } from "@/components/charts/ranking-history-loader";
import { TopTracksSection } from "@/components/detail/top-tracks-section";
import { TimeRangeQueryTabs } from "@/components/time-range-query-tabs";
import { ArrowLeft, Play } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ time_range?: string | string[] }>;
}

export default async function AlbumDetailPage({ params, searchParams }: PageProps) {
  const { id: albumId } = await params;
  const { time_range: rawTimeRange } = (await searchParams) ?? {};
  const timeRange = parseTimeRange(
    Array.isArray(rawTimeRange) ? rawTimeRange[0] : rawTimeRange,
    "medium_term"
  );

  const [album, tracks] = await Promise.all([
    getAlbumDetails(albumId),
    getTopTracks(timeRange, 50),
  ]);

  const rankedAlbums = await getTopAlbums(timeRange, 50, tracks);
  const rankedAlbum = rankedAlbums.find((albumItem) => albumItem.id === albumId) ?? null;

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

  const imageUrl = album.images[1]?.url ?? album.images[0]?.url ?? null;
  const artistName = album.artists.map((artist) => artist.name).join(", ");
  const primaryArtistId = album.artists[0]?.id;

  if (!primaryArtistId) {
    notFound();
  }

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
          <Button size="lg" className="rounded-full h-14 w-14 p-0" asChild>
            <a
              href={album.external_urls.spotify}
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
