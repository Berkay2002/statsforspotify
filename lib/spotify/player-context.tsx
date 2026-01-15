/// <reference types="../../types/spotify-player" />

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface Track {
  id: string | null;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
  uri: string;
}

interface PlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  position: number;
  duration: number;
  track: Track | null;
  volume: number;
  deviceId: string | null;
  isActive: boolean;
  isReady: boolean;
  error: string | null;
}

interface SpotifyPlayerContextType {
  player: Spotify.PlayerInstance | null;
  playerState: PlayerState;
  isLoading: boolean;
  isPremium: boolean;

  // Actions
  initializePlayer: () => Promise<void>;
  play: (uri?: string, contextUri?: string, uris?: string[]) => Promise<void>;
  pause: () => Promise<void>;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  transferPlayback: (deviceId: string) => Promise<void>;
  getDevices: () => Promise<Spotify.Device[]>;
  addToQueue: (uri: string) => Promise<void>;
}

const SpotifyPlayerContext = createContext<SpotifyPlayerContextType | undefined>(undefined);

export const useSpotifyPlayer = () => {
  const context = useContext(SpotifyPlayerContext);
  if (!context) {
    throw new Error("useSpotifyPlayer must be used within SpotifyPlayerProvider");
  }
  return context;
};

interface SpotifyPlayerProviderProps {
  children: React.ReactNode;
}

export const SpotifyPlayerProvider: React.FC<SpotifyPlayerProviderProps> = ({ children }) => {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [player, setPlayer] = useState<Spotify.PlayerInstance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(true);
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    isPaused: true,
    position: 0,
    duration: 0,
    track: null,
    volume: 0.5,
    deviceId: null,
    isActive: false,
    isReady: false,
    error: null,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const deviceIdRef = useRef<string | null>(null);

  // Load Spotify SDK script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Initialize player when window.Spotify is available
  const initializePlayer = useCallback(async () => {
    if (!session?.provider_token || player) return;

    setIsLoading(true);

    try {
      // Wait for Spotify to be available
      while (!window.Spotify) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const player = new window.Spotify.Player({
        name: "Stats for Spotify Player",
        getOAuthToken: async (cb: (token: string) => void) => {
          // Fetch fresh token from Supabase session
          const { data: { session: freshSession } } = await supabase.auth.getSession();
          if (freshSession?.provider_token) {
            cb(freshSession.provider_token);
          } else {
            console.error("No provider token available");
          }
        },
        volume: 0.5,
      });

      // Error handling
      player.addListener("initialization_error", ({ message }: { message: string }) => {
        console.error("Failed to initialize:", message);
        setPlayerState(prev => ({ ...prev, error: message }));
      });

      player.addListener("authentication_error", ({ message }: { message: string }) => {
        // Log as warning since player may still work despite scope warnings
        console.warn("Player authentication warning:", message);
        // Only set isPremium to false, don't show error to user if player works
        setIsPremium(false);
      });

      player.addListener("account_error", ({ message }: { message: string }) => {
        console.error("Failed to validate account:", message);
        setIsPremium(false);
      });

      player.addListener("playback_error", ({ message }: { message: string }) => {
        console.error("Failed to perform playback:", message);
        setPlayerState(prev => ({ ...prev, error: message }));
      });

      // Ready
      player.addListener("ready", ({ device_id }: { device_id: string }) => {
        console.log("Ready with Device ID", device_id);
        deviceIdRef.current = device_id;
        
        // Give Spotify servers a moment to register the device before marking ready
        setTimeout(() => {
          setPlayerState(prev => ({
            ...prev,
            deviceId: device_id,
            isReady: true,
            error: null
          }));
        }, 1000);
      });

      // Not Ready
      player.addListener("not_ready", ({ device_id }: { device_id: string }) => {
        console.log("Device ID has gone offline", device_id);
        setPlayerState(prev => ({
          ...prev,
          isReady: false,
          error: "Device offline"
        }));
      });

      // Player state changed
      player.addListener("player_state_changed", (state: Spotify.PlaybackState | null) => {
        if (!state) return;

        setPlayerState(prev => ({
          ...prev,
          isPlaying: !state.paused,
          isPaused: state.paused,
          position: state.position,
          duration: state.duration,
          track: state.track_window.current_track,
          volume: prev.volume,
          isActive: state.position !== 0 || state.duration !== 0,
          error: null,
        }));
      });

      // Connect the player
      await player.connect();
      setPlayer(player);
    } catch (error) {
      console.error("Failed to initialize player:", error);
      setPlayerState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error"
      }));
    } finally {
      setIsLoading(false);
    }
  }, [session?.provider_token, player, supabase]);

  // Player control functions - Define transferPlayback first to avoid circular dependency
  const transferPlayback = useCallback(async (deviceId: string) => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${session?.provider_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to transfer playback: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Transfer error:", error);
      setPlayerState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to transfer playback"
      }));
    }
  }, [session?.provider_token]);

  const play = useCallback(async (uri?: string, contextUri?: string, uris?: string[]) => {
    if (!player || !deviceIdRef.current) {
      console.error("Player or device not ready", { player: !!player, deviceId: deviceIdRef.current });
      return;
    }

    try {
      const body = {
        device_id: deviceIdRef.current,
        ...(uri && { uris: [uri] }),
        ...(contextUri && { context_uri: contextUri }),
        ...(uris && { uris }),
      };

      console.log("Playing with body:", body);

      const response = await fetch("https://api.spotify.com/v1/me/player/play", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${session?.provider_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // If device not found, try to transfer playback first (this is normal on first play)
        if (response.status === 404) {
          console.log("Device not active, transferring playback...");
          try {
            await transferPlayback(deviceIdRef.current);
            
            // Wait a moment for device to activate
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Retry play after transfer
            const retryResponse = await fetch("https://api.spotify.com/v1/me/player/play", {
              method: "PUT",
              headers: {
                "Authorization": `Bearer ${session?.provider_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            });
            
            if (!retryResponse.ok) {
              const retryError = await retryResponse.text();
              console.warn("Retry failed:", retryResponse.status, retryError);
              // Don't throw - just log and set a user-friendly error
              setPlayerState(prev => ({
                ...prev,
                error: "Player not ready yet. Please try again in a moment."
              }));
              return;
            }
          } catch (transferError) {
            console.warn("Transfer/retry failed:", transferError);
            setPlayerState(prev => ({
              ...prev,
              error: "Player not ready yet. Please try again in a moment."
            }));
            return;
          }
        } else {
          // Log other errors (not 404) as actual errors
          console.error("Play failed:", response.status, errorText);
          throw new Error(`Failed to play: ${response.status} ${errorText}`);
        }
      }
    } catch (error) {
      console.error("Play error:", error);
      setPlayerState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to play"
      }));
    }
  }, [player, session?.provider_token, transferPlayback]);

  const pause = useCallback(async () => {
    if (!player) return;
    await player.pause();
  }, [player]);

  const togglePlay = useCallback(async () => {
    if (!player) return;
    await player.togglePlay();
  }, [player]);

  const nextTrack = useCallback(async () => {
    if (!player) return;
    await player.nextTrack();
  }, [player]);

  const previousTrack = useCallback(async () => {
    if (!player) return;
    await player.previousTrack();
  }, [player]);

  const seek = useCallback(async (position: number) => {
    if (!player) return;
    await player.seek(position);
  }, [player]);

  const setVolume = useCallback(async (volume: number) => {
    if (!player) return;
    await player.setVolume(Math.max(0, Math.min(1, volume)));
    setPlayerState(prev => ({ ...prev, volume }));
  }, [player]);

  const getDevices = useCallback(async (): Promise<Spotify.Device[]> => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me/player/devices", {
        headers: {
          "Authorization": `Bearer ${session?.provider_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get devices: ${response.statusText}`);
      }

      const data = await response.json() as { devices: Spotify.Device[] };
      return data.devices || [];
    } catch (error) {
      console.error("Get devices error:", error);
      return [];
    }
  }, [session?.provider_token]);

  const addToQueue = useCallback(async (uri: string) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.provider_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to add to queue: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Add to queue error:", error);
      setPlayerState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to add to queue"
      }));
    }
  }, [session?.provider_token]);

  // Auto-initialize player on mount
  useEffect(() => {
    if (session?.provider_token && !player) {
      initializePlayer();
    }
  }, [session?.provider_token, player, initializePlayer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [player]);

  const value: SpotifyPlayerContextType = {
    player,
    playerState,
    isLoading,
    isPremium,
    initializePlayer,
    play,
    pause,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
    transferPlayback,
    getDevices,
    addToQueue,
  };

  return (
    <SpotifyPlayerContext.Provider value={value}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
};