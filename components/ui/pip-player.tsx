"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Music, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, PanelTopClose } from "lucide-react";

interface PipPlayerProps {
  track: {
    name: string;
    artists: { name: string }[];
    album: { name: string; images: { url: string }[] };
  };
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  disabled: boolean;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (position: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onReturn: () => void;
}

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function PipPlayer({ track, isPlaying, position, duration, volume, disabled,
  onTogglePlay, onPrevious, onNext, onSeek, onVolumeChange, onToggleMute, onReturn,
}: PipPlayerProps) {
  const artwork = track.album.images[0]?.url;
  const artists = track.artists.map(artist => artist.name).join(", ");
  const volumeInput = useRef<HTMLInputElement>(null);
  const [failedArtwork, setFailedArtwork] = useState<string | null>(null);
  const showArtwork = artwork && artwork !== failedArtwork;
  const elapsed = Math.max(0, Math.min(position, duration));

  useEffect(() => {
    if (volumeInput.current) volumeInput.current.value = String(volume);
  }, [volume]);

  return (
    <section className="pip-player" aria-label="Now playing player">
      <div className="pip-player-artwork">
        {showArtwork ? (
          <>
            <Image src={artwork} alt="" fill sizes="640px" className="pip-player-backdrop" aria-hidden="true" unoptimized />
            <Image
              src={artwork} alt={track.album.name} fill sizes="640px"
              className="pip-player-cover" unoptimized
              onError={() => setFailedArtwork(artwork)}
            />
          </>
        ) : (
          <div className="pip-player-placeholder" aria-label="No album artwork"><Music aria-hidden="true" /></div>
        )}

        <div className="pip-player-overlay" role="group" aria-label="Playback controls">
          <div className="pip-player-toolbar">
            <div className="pip-player-volume">
              <button type="button" className="pip-player-icon" aria-label={volume === 0 ? "Unmute" : "Mute"} onClick={onToggleMute}>
                {volume === 0 ? <VolumeX /> : <Volume2 />}
              </button>
              <input ref={volumeInput} type="range" aria-label="Volume" min={0} max={1} step={0.01} defaultValue={volume}
                onChange={event => onVolumeChange(Number(event.target.value))}
              />
            </div>
            <button type="button" className="pip-player-icon" aria-label="Return player to website" title="Return to website" onClick={onReturn}>
              <PanelTopClose />
            </button>
          </div>

          <div className="pip-player-transport">
            <button type="button" className="pip-player-icon" aria-label="Previous track" onClick={onPrevious} disabled={disabled}><SkipBack fill="currentColor" /></button>
            <button type="button" className="pip-player-play" aria-label={isPlaying ? "Pause" : "Play"} onClick={onTogglePlay} disabled={disabled}>
              {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
            </button>
            <button type="button" className="pip-player-icon" aria-label="Next track" onClick={onNext} disabled={disabled}><SkipForward fill="currentColor" /></button>
          </div>

          <div className="pip-player-timeline">
            <div className="pip-player-times"><span>{formatTime(elapsed)}</span><span>{formatTime(duration)}</span></div>
            <input
              type="range" aria-label="Seek" aria-valuetext={`${formatTime(elapsed)} of ${formatTime(duration)}`}
              min={0} max={Math.max(1, duration)} step={1000} value={elapsed} disabled={duration <= 0}
              style={{ backgroundSize: `${duration > 0 ? elapsed / duration * 100 : 0}% 100%` }}
              onChange={event => onSeek(Number(event.target.value))}
            />
          </div>
        </div>
      </div>

      <footer className="pip-player-footer">
        <p className="pip-player-title" title={`${track.name} · ${artists}`}>
          <span>{track.name}</span><span aria-hidden="true"> · </span><span>{artists}</span>
        </p>
        <p className="pip-player-brand"><Volume2 aria-hidden="true" />Stats for Spotify Player</p>
      </footer>
    </section>
  );
}
