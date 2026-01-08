import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import { ArtistsList } from "@/components/artists-list";
import { TracksList } from "@/components/tracks-list";
import { AlbumsList } from "@/components/albums-list";
import { SpotifyAttribution } from "@/components/spotify-stats-logo";
import { FriendFollowButton } from "@/components/friend-follow-button";
import type { Database } from "@/lib/supabase/database";

interface Props {
  params: Promise<{ username: string; discriminator: string }>;
}

type ArtistRanking = Database['public']['Tables']['artist_rankings']['Row'];
type TrackRanking = Database['public']['Tables']['track_rankings']['Row'];
type AlbumRanking = Database['public']['Tables']['album_rankings']['Row'];

export default async function FriendProfilePage({ params }: Props) {
  const { username, discriminator } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/");
  }
  
  // Find friend profile
  const { data: friendProfile, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("display_name", decodeURIComponent(username))
    .eq("discriminator", discriminator)
    .single();
  
  // Fallback: Try to find by old username via discriminator lookup
  if (error || !friendProfile) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("discriminator", discriminator)
      .limit(10);
    
    if (profiles && profiles.length === 1) {
      const newUsername = profiles[0].display_name;
      redirect(`/dashboard/friends/${encodeURIComponent(newUsername)}/${discriminator}`);
    }
    
    notFound();
  }
  
  // Check friendship status using our internal friendships table
  const friendshipStatus = await checkFriendshipStatus(supabase, user.id, friendProfile.user_id);
  
  const canView = friendProfile.stats_visibility === "public" ||
    (friendProfile.stats_visibility === "followers" && friendshipStatus.isFriend);
  
  if (!canView) {
    return (
      <div className="container mx-auto max-w-4xl py-12">
        <Card>
          <CardHeader className="text-center">
            <Avatar className="mx-auto h-24 w-24 mb-4">
              <AvatarImage src={friendProfile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {friendProfile.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <CardTitle>{friendProfile.display_name}#{friendProfile.discriminator}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                {friendshipStatus.status === "none" && (
                  "This user's stats are private. Send them a friend request to view their stats."
                )}
                {friendshipStatus.status === "pending" && friendshipStatus.isIncoming && (
                  "This user has sent you a friend request. Accept it to view their stats."
                )}
                {friendshipStatus.status === "pending" && !friendshipStatus.isIncoming && (
                  "Friend request pending. They need to accept your request to view their stats."
                )}
              </AlertDescription>
            </Alert>
            <div className="flex justify-center">
              <FriendFollowButton
                friendUserId={friendProfile.user_id}
                initialStatus={friendshipStatus}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Get the most recent snapshot for this user
  const { data: latestSnapshot } = await supabase
    .from("snapshots")
    .select("id, created_at, time_range")
    .eq("user_id", friendProfile.user_id)
    .order("created_at", { ascending: false })
    .limit(3);
  
  if (!latestSnapshot || latestSnapshot.length === 0) {
    return (
      <div className="container mx-auto max-w-4xl py-12">
        <Card>
          <CardHeader className="text-center">
            <Avatar className="mx-auto h-24 w-24 mb-4">
              <AvatarImage src={friendProfile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {friendProfile.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <CardTitle>{friendProfile.display_name}#{friendProfile.discriminator}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              This user hasn&apos;t collected any snapshots yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Get snapshot IDs by time range
  const snapshotsByTimeRange = latestSnapshot.reduce((acc, snap) => {
    if (!acc[snap.time_range as keyof typeof acc]) {
      acc[snap.time_range as keyof typeof acc] = snap.id;
    }
    return acc;
  }, {} as { short_term?: string; medium_term?: string; long_term?: string });
  
  // Fetch rankings for each time range
  const [artistsShort, artistsMedium, artistsLong] = await Promise.all([
    snapshotsByTimeRange.short_term
      ? supabase
          .from("artist_rankings")
          .select("*")
          .eq("snapshot_id", snapshotsByTimeRange.short_term)
          .order("rank", { ascending: true })
          .limit(50)
      : { data: [] },
    snapshotsByTimeRange.medium_term
      ? supabase
          .from("artist_rankings")
          .select("*")
          .eq("snapshot_id", snapshotsByTimeRange.medium_term)
          .order("rank", { ascending: true })
          .limit(50)
      : { data: [] },
    snapshotsByTimeRange.long_term
      ? supabase
          .from("artist_rankings")
          .select("*")
          .eq("snapshot_id", snapshotsByTimeRange.long_term)
          .order("rank", { ascending: true })
          .limit(50)
      : { data: [] },
  ]);
  
  const [tracksShort, tracksMedium, tracksLong] = await Promise.all([
    snapshotsByTimeRange.short_term
      ? supabase
          .from("track_rankings")
          .select("*")
          .eq("snapshot_id", snapshotsByTimeRange.short_term)
          .order("rank", { ascending: true })
          .limit(50)
      : { data: [] },
    snapshotsByTimeRange.medium_term
      ? supabase
          .from("track_rankings")
          .select("*")
          .eq("snapshot_id", snapshotsByTimeRange.medium_term)
          .order("rank", { ascending: true })
          .limit(50)
      : { data: [] },
    snapshotsByTimeRange.long_term
      ? supabase
          .from("track_rankings")
          .select("*")
          .eq("snapshot_id", snapshotsByTimeRange.long_term)
          .order("rank", { ascending: true })
          .limit(50)
      : { data: [] },
  ]);
  
  const [albumsShort, albumsMedium, albumsLong] = await Promise.all([
    snapshotsByTimeRange.short_term
      ? supabase
          .from("album_rankings")
          .select("*")
          .eq("snapshot_id", snapshotsByTimeRange.short_term)
          .order("rank", { ascending: true })
          .limit(50)
      : { data: [] },
    snapshotsByTimeRange.medium_term
      ? supabase
          .from("album_rankings")
          .select("*")
          .eq("snapshot_id", snapshotsByTimeRange.medium_term)
          .order("rank", { ascending: true })
          .limit(50)
      : { data: [] },
    snapshotsByTimeRange.long_term
      ? supabase
          .from("album_rankings")
          .select("*")
          .eq("snapshot_id", snapshotsByTimeRange.long_term)
          .order("rank", { ascending: true })
          .limit(50)
      : { data: [] },
  ]);
  
  // Transform database records to match component props
  const transformArtists = (data: ArtistRanking[] | null) =>
    (data || []).map((artistRanking) => ({
      id: artistRanking.artist_id,
      name: artistRanking.artist_name,
      rank: artistRanking.rank,
      imageUrl: artistRanking.artist_image_url,
      genres: artistRanking.genres || [],
    }));
  
  const transformTracks = (data: TrackRanking[] | null) =>
    (data || []).map((trackRanking) => ({
      id: trackRanking.track_id,
      name: trackRanking.track_name,
      rank: trackRanking.rank,
      imageUrl: trackRanking.track_image_url,
      artistId: trackRanking.artist_id,
      artistName: trackRanking.artist_name,
      albumId: trackRanking.album_id,
      albumName: trackRanking.album_name,
      durationMs: trackRanking.duration_ms || 0,
      popularity: trackRanking.popularity || 0,
    }));
  
  const transformAlbums = (data: AlbumRanking[] | null) =>
    (data || []).map((albumRanking) => ({
      id: albumRanking.album_id,
      name: albumRanking.album_name,
      rank: albumRanking.rank,
      imageUrl: albumRanking.album_image_url,
      artistId: albumRanking.artist_id,
      artistName: albumRanking.artist_name,
      releaseDate: albumRanking.release_date || "",
      totalTracks: albumRanking.total_tracks || 0,
      trackCount: albumRanking.track_count || 1,
    }));
  
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4 justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={friendProfile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {friendProfile.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl">
                  {friendProfile.display_name}
                  <span className="text-muted-foreground">#{friendProfile.discriminator}</span>
                </CardTitle>
                <CardDescription className="mt-2 space-y-2">
                  <div>
                    <Badge variant="secondary">
                      {friendProfile.stats_visibility === "public" ? "Public Profile" : "Friend"}
                    </Badge>
                  </div>
                  <FriendFollowButton
                    friendUserId={friendProfile.user_id}
                    initialStatus={friendshipStatus}
                  />
                </CardDescription>
              </div>
            </div>
            <SpotifyAttribution />
          </div>
        </CardHeader>
      </Card>
      
      {/* Top Artists */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight">Top Artists</h2>
          <p className="text-sm text-muted-foreground">
            Their most played artists on Spotify
          </p>
        </div>
        <ArtistsList
          artistsByTimeRange={{
            short_term: transformArtists(artistsShort.data),
            medium_term: transformArtists(artistsMedium.data),
            long_term: transformArtists(artistsLong.data),
          }}
        />
      </div>
      
      {/* Top Tracks */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight">Top Tracks</h2>
          <p className="text-sm text-muted-foreground">
            Their most played tracks on Spotify
          </p>
        </div>
        <TracksList
          tracksByTimeRange={{
            short_term: transformTracks(tracksShort.data),
            medium_term: transformTracks(tracksMedium.data),
            long_term: transformTracks(tracksLong.data),
          }}
        />
      </div>
      
      {/* Top Albums */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight">Top Albums</h2>
          <p className="text-sm text-muted-foreground">
            Their most played albums on Spotify
          </p>
        </div>
        <AlbumsList
          albumsByTimeRange={{
            short_term: transformAlbums(albumsShort.data),
            medium_term: transformAlbums(albumsMedium.data),
            long_term: transformAlbums(albumsLong.data),
          }}
        />
      </div>
    </div>
  );
}

async function checkFriendshipStatus(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  currentUserId: string,
  friendUserId: string
): Promise<{ status: "none" | "pending" | "accepted" | "blocked"; isFriend: boolean; isPending: boolean; isIncoming: boolean }> {
  try {
    const { data: friendship, error } = await supabase
      .from("friendships")
      .select("id, status, user_id, friend_id")
      .or(`and(user_id.eq.${currentUserId},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${currentUserId})`)
      .single();
    
    if (error || !friendship) {
      return { status: "none", isFriend: false, isPending: false, isIncoming: false };
    }
    
    const isIncoming = friendship.friend_id === currentUserId && friendship.status === "pending";
    
    return {
      status: friendship.status as "none" | "pending" | "accepted" | "blocked",
      isFriend: friendship.status === "accepted",
      isPending: friendship.status === "pending",
      isIncoming,
    };
  } catch (error) {
    console.error("Error checking friendship status:", error);
    return { status: "none", isFriend: false, isPending: false, isIncoming: false };
  }
}
