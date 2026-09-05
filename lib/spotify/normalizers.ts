import { deriveAlbums } from "@/supabase/functions/_shared/snapshots";
import type { SpotifyArtist, SpotifyTrack, RankedArtist, RankedTrack, RankedAlbum } from "./types";

export function normalizePopularity(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeTopArtists(artists: SpotifyArtist[]): RankedArtist[] {
  return artists.map((artist, index) => ({
    rank: index + 1,
    id: artist.id,
    name: artist.name,
    imageUrl: artist.images?.[1]?.url ?? artist.images?.[0]?.url ?? null,
    genres: artist.genres ?? [],
    popularity: normalizePopularity(artist.popularity),
  }));
}

export function normalizeTopTracks(tracks: SpotifyTrack[]): RankedTrack[] {
  return tracks.map((track, index) => ({
    rank: index + 1,
    id: track.id,
    name: track.name,
    imageUrl: track.album.images?.[1]?.url ?? track.album.images?.[0]?.url ?? null,
    artistId: track.artists[0]?.id ?? "",
    artistName: track.artists.map(artist => artist.name).join(", "),
    albumId: track.album.id,
    albumName: track.album.name,
    durationMs: track.duration_ms,
    popularity: normalizePopularity(track.popularity),
  }));
}

export function extractAlbumsFromTracks(tracks: RankedTrack[]): RankedAlbum[] {
  return deriveAlbums(tracks).map(album => ({
    rank: album.rank,
    id: album.album_id,
    name: album.album_name,
    imageUrl: album.album_image_url,
    artistId: album.artist_id,
    artistName: album.artist_name,
    releaseDate: "",
    totalTracks: 0,
    trackCount: album.track_count,
  }));
}

export function selectArtistTopTracks(tracks: SpotifyTrack[], artistId: string, limit: number): RankedTrack[] {
  // Keep the original user ranking, including tracks where this artist is a collaborator.
  return normalizeTopTracks(tracks)
    .filter((_track, index) => tracks[index].artists.some(artist => artist.id === artistId))
    .slice(0, limit);
}
