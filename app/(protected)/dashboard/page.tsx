import Image from "next/image";
import Link from "next/link";
import { getTopArtists, getTopTracks, getTopAlbums } from "@/lib/spotify/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Music, Disc, ChevronRight, RefreshCw } from "lucide-react";

export default async function DashboardPage() {
  let artists: Awaited<ReturnType<typeof getTopArtists>> | undefined;
  let tracks: Awaited<ReturnType<typeof getTopTracks>> | undefined;
  let albums: Awaited<ReturnType<typeof getTopAlbums>> | undefined;
  let error: string | null = null;

  try {
    [artists, tracks, albums] = await Promise.all([
      getTopArtists("medium_term", 5),
      getTopTracks("medium_term", 5),
      getTopAlbums("medium_term", 5),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load data";
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">{error}</p>
        <Button asChild>
          <Link href="/login">Re-authenticate with Spotify</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          Your top music from the last 6 months
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Top Artists"
          value={artists?.length ?? 0}
          icon={<Users className="h-4 w-4" />}
          href="/dashboard/artists"
        />
        <StatCard
          title="Top Tracks"
          value={tracks?.length ?? 0}
          icon={<Music className="h-4 w-4" />}
          href="/dashboard/tracks"
        />
        <StatCard
          title="Top Albums"
          value={albums?.length ?? 0}
          icon={<Disc className="h-4 w-4" />}
          href="/dashboard/albums"
        />
      </div>

      {/* Top Items Preview */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Top Artists */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Top Artists</CardTitle>
              <CardDescription>Your most played artists</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/artists">
                View all
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {artists?.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/dashboard/artists/${artist.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <span className="w-5 text-sm font-medium text-muted-foreground">
                    {artist.rank}
                  </span>
                  {artist.imageUrl ? (
                    <Image
                      src={artist.imageUrl}
                      alt={artist.name}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted" />
                  )}
                  <div className="flex-1 truncate">
                    <p className="truncate font-medium">{artist.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {artist.genres.slice(0, 2).join(", ") || "No genres"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Tracks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Top Tracks</CardTitle>
              <CardDescription>Your most played songs</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/tracks">
                View all
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tracks?.map((track) => (
                <Link
                  key={track.id}
                  href={`/dashboard/tracks/${track.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <span className="w-5 text-sm font-medium text-muted-foreground">
                    {track.rank}
                  </span>
                  {track.imageUrl ? (
                    <Image
                      src={track.imageUrl}
                      alt={track.name}
                      width={40}
                      height={40}
                      className="rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted" />
                  )}
                  <div className="flex-1 truncate">
                    <p className="truncate font-medium">{track.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {track.artistName}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Albums */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Top Albums</CardTitle>
              <CardDescription>Albums from your top tracks</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/albums">
                View all
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {albums?.map((album) => (
                <Link
                  key={album.id}
                  href={`/dashboard/albums/${album.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <span className="w-5 text-sm font-medium text-muted-foreground">
                    {album.rank}
                  </span>
                  {album.imageUrl ? (
                    <Image
                      src={album.imageUrl}
                      alt={album.name}
                      width={40}
                      height={40}
                      className="rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted" />
                  )}
                  <div className="flex-1 truncate">
                    <p className="truncate font-medium">{album.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {album.artistName}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {album.trackCount} {album.trackCount === 1 ? "track" : "tracks"}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Snapshot CTA */}
      <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <h3 className="font-medium">Save a Snapshot</h3>
            <p className="text-sm text-muted-foreground">
              Capture your current rankings to track changes over time
            </p>
          </div>
          <form action="/api/snapshot" method="POST">
            <Button type="submit">
              <RefreshCw className="mr-2 h-4 w-4" />
              Save Snapshot
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  href,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <Link
          href={href}
          className="text-xs text-muted-foreground hover:underline"
        >
          View details →
        </Link>
      </CardContent>
    </Card>
  );
}
