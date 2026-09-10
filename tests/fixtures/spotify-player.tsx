// Only the Spotify boundary is replaced. The player, hooks, controls, and browser APIs are real.
import { useState } from "react";

const idle = async () => {};
export function useSpotifyPlayer() {
  const [playerState, setState] = useState({
    track: { name: "Test track", artists: [{ name: "Test artist" }], album: { name: "Test album", images: [{ url: "/test-album.svg" }] } },
    isPlaying: false, position: 20000, duration: 180000, volume: 0.5,
  });
  return {
    playerState, isPWA: false, getCurrentPlayback: idle,
    togglePlay: () => setState(state => ({ ...state, isPlaying: !state.isPlaying })),
    nextTrack: () => setState(state => ({ ...state, track: { ...state.track, name: "Next track" } })),
    previousTrack: () => setState(state => ({ ...state, track: { ...state.track, name: "Previous track" } })),
    seek: (position: number) => setState(state => ({ ...state, position })),
    setVolume: (volume: number) => setState(state => ({ ...state, volume })),
  };
}
