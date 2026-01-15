// Spotify Web Playback SDK Types

declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady: () => void;
  }

  namespace Spotify {
    interface PlayerInstance {
      connect(): Promise<boolean>;
      disconnect(): void;
      getCurrentState(): Promise<PlaybackState | null>;
      setName(name: string): Promise<void>;
      getVolume(): Promise<number>;
      setVolume(volume: number): Promise<void>;
      pause(): Promise<void>;
      resume(): Promise<void>;
      togglePlay(): Promise<void>;
      seek(position: number): Promise<void>;
      previousTrack(): Promise<void>;
      nextTrack(): Promise<void>;
      addListener(event: 'ready', callback: (data: WebPlaybackPlayer) => void): boolean;
      addListener(event: 'not_ready', callback: (data: WebPlaybackPlayer) => void): boolean;
      addListener(event: 'player_state_changed', callback: (state: PlaybackState | null) => void): boolean;
      addListener(event: 'autoplay_failed', callback: () => void): boolean;
      addListener(event: 'initialization_error', callback: (error: ErrorMessage) => void): void;
      addListener(event: 'authentication_error', callback: (error: ErrorMessage) => void): void;
      addListener(event: 'account_error', callback: (error: ErrorMessage) => void): void;
      addListener(event: 'playback_error', callback: (error: ErrorMessage) => void): void;
      removeListener(event: string, callback?: (data?: unknown) => void): boolean;
      activateElement(): Promise<void>;
    }

    interface PlayerConstructor {
      new (options: PlayerOptions): PlayerInstance;
    }

    const Player: PlayerConstructor;

    interface WebPlaybackPlayer {
      device_id: string;
    }

    interface PlayerOptions {
      name: string;
      getOAuthToken: (callback: (token: string) => void) => void;
      volume?: number;
      enableMediaSession?: boolean;
    }

    interface PlaybackState {
      context: {
        uri: string | null;
        metadata: Record<string, unknown> | null;
      };
      disallows: {
        pausing: boolean;
        peeking_next: boolean;
        peeking_prev: boolean;
        resuming: boolean;
        seeking: boolean;
        skipping_next: boolean;
        skipping_prev: boolean;
        toggling_repeat_context: boolean;
        toggling_repeat_track: boolean;
        toggling_shuffle: boolean;
      };
      duration: number;
      paused: boolean;
      position: number;
      repeat_mode: 0 | 1 | 2;
      shuffle: boolean;
      timestamp: number;
      track_window: {
        current_track: Track;
        previous_tracks: Track[];
        next_tracks: Track[];
      };
    }

    interface Track {
      id: string | null;
      uri: string;
      type: "track" | "episode" | "ad" | "unknown";
      media_type: "audio" | "video" | "audio_video";
      name: string;
      is_playable: boolean;
      album: {
        uri: string;
        name: string;
        images: Image[];
      };
      artists: Artist[];
      duration_ms: number;
    }

    interface Artist {
      uri: string;
      name: string;
    }

    interface Image {
      url: string;
      height: number | null;
      width: number | null;
    }

    interface Device {
      id: string;
      is_active: boolean;
      is_private_session: boolean;
      is_restricted: boolean;
      name: string;
      type: string;
      volume_percent: number;
    }

    interface ErrorMessage {
      message: string;
    }
  }
}

export {};