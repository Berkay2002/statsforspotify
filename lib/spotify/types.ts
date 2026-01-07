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

export interface RankingHistory {
  date: string;
  rank: number;
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
