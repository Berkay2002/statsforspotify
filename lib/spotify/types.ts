// Spotify API Type Definitions

export type TimeRange = "short_term" | "medium_term" | "long_term";

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  images: SpotifyImage[];
  external_urls: {
    spotify: string;
  };
  followers?: {
    total: number;
  };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date: string;
  total_tracks: number;
  album_type: string;
  artists: {
    id: string;
    name: string;
  }[];
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  track_number: number;
  explicit: boolean;
  album: SpotifyAlbum;
  artists: {
    id: string;
    name: string;
  }[];
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyTopItemsResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  href: string;
  next: string | null;
  previous: string | null;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: SpotifyImage[];
  country: string;
  product: string;
  external_urls: {
    spotify: string;
  };
}

// App-specific types for processed data
export interface RankedArtist {
  rank: number;
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
  popularity: number;
}

export interface RankedTrack {
  rank: number;
  id: string;
  name: string;
  imageUrl: string | null;
  artistId: string;
  artistName: string;
  albumId: string;
  albumName: string;
  durationMs: number;
  popularity: number;
}

export interface RankedAlbum {
  rank: number;
  id: string;
  name: string;
  imageUrl: string | null;
  artistId: string;
  artistName: string;
  releaseDate: string;
  totalTracks: number;
  trackCount: number; // How many tracks from this album appear in top tracks
}

export interface RankedGenre {
  rank: number;
  name: string;
  trackCount: number; // How many tracks in this genre
  artistCount: number; // How many artists tagged with this genre
  topArtists: string[]; // Names of top artists in this genre
}

export interface RankingHistory {
  date: string;
  rank: number;
  isNewEntry?: boolean;
  isReentry?: boolean;
}

export interface RankingHistoryMetadata {
  peakRank: number;
  peakDate: string;
  totalSnapshots: number;
  firstSeen: string;
  lastSeen: string;
  currentRank: number | null;
}

export interface RankingHistoryResponse {
  history: RankingHistory[];
  metadata: RankingHistoryMetadata;
}

export interface SparklineData {
  date: string;
  rank: number;
}

export interface SparklineResponse {
  sparklines: Record<string, SparklineData[]>;
}

export interface ArtistWithHistory extends RankedArtist {
  history: RankingHistory[];
}

export interface TrackWithHistory extends RankedTrack {
  history: RankingHistory[];
}

export interface AlbumWithHistory extends RankedAlbum {
  history: RankingHistory[];
}

// Spotify Follow API types
export interface SpotifyUserSimple {
  id: string;
  display_name: string;
  external_urls: {
    spotify: string;
  };
  followers?: {
    total: number;
  };
  href: string;
  images: SpotifyImage[];
  type: "user";
  uri: string;
}

export interface SpotifyFollowedUsersResponse {
  artists: {
    items: SpotifyUserSimple[];
    next: string | null;
    total: number;
    cursors: {
      after: string | null;
    };
    limit: number;
    href: string;
  };
}

export interface FollowCheckResult {
  spotifyUserId: string;
  isFollowing: boolean;
  isMutual: boolean;
}

export interface MutualFriendsResult {
  mutualFriends: Array<{
    spotifyUserId: string;
    displayName: string;
    avatarUrl: string | null;
    username: string;
    discriminator: string;
  }>;
  followBackSuggestions: Array<{
    spotifyUserId: string;
    displayName: string;
    avatarUrl: string | null;
  }>;
}
