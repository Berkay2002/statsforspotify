import Image from "next/image";
import Link from "next/link";
import { getTopArtists, getTopTracks, getTopGenres } from "@/lib/spotify/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/login-dialog";
import { SpotifyAttribution } from "@/components/spotify-stats-logo";
import { Users, Music, Music2, ChevronRight, RefreshCw } from "lucide-react";

export default async function DashboardPage() {
  let artists: Awaited<ReturnType<typeof getTopArtists>> | undefined;
  let tracks: Awaited<ReturnType<typeof getTopTracks>> | undefined;
  let genres: Awaited<ReturnType<typeof getTopGenres>> | undefined;
  let error: string | null = null;

  try {
    [artists, tracks, genres] = await Promise.all([
      getTopArtists("medium_term", 5),
      getTopTracks("medium_term", 5),
      getTopGenres("medium_term", 5),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load data";
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">{error}</p>
        <LoginDialog>
          <Button>Re-authenticate with Spotify</Button>
        </LoginDialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">
            Your top music from the last 6 months
          </p>
        </div>
        <SpotifyAttribution />
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
          title="Top Genres"
          value={genres?.length ?? 0}
          icon={<Music2 className="h-4 w-4" />}
          href="/dashboard/genres"
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
                <div key={artist.id} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
                  <Link
                    href={`/dashboard/artists/${artist.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
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
                  <a
                    href={`https://open.spotify.com/artist/${artist.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1DB954] hover:text-[#1ed760] transition-colors"
                    title="Open in Spotify"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </a>
                </div>
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
                <div key={track.id} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
                  <Link
                    href={`/dashboard/tracks/${track.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
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
                        className="rounded-[4px] object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-[4px] bg-muted" />
                    )}
                    <div className="flex-1 truncate">
                      <p className="truncate font-medium">{track.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {track.artistName}
                      </p>
                    </div>
                  </Link>
                  <a
                    href={`https://open.spotify.com/track/${track.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1DB954] hover:text-[#1ed760] transition-colors"
                    title="Play on Spotify"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Genres */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Top Genres</CardTitle>
              <CardDescription>Your favorite music genres</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/genres">
                View all
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {genres?.map((genre) => (
                <div
                  key={genre.name}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <span className="w-5 text-sm font-medium text-muted-foreground">
                    {genre.rank}
                  </span>
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Music2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 truncate">
                    <p className="truncate font-medium capitalize">{genre.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {genre.artistCount} {genre.artistCount === 1 ? "artist" : "artists"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    #{genre.rank}
                  </Badge>
                </div>
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
