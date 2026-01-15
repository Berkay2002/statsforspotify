"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  Music,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpotifyPlayer } from "@/lib/spotify/player-context";
import { useIsMobile } from "@/hooks/use-mobile";

const formatTime = (ms: number = 0) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

interface FloatingPlayerProps {
  className?: string;
}

export const FloatingPlayer: React.FC<FloatingPlayerProps> = ({ className }) => {
  const {
    playerState,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
    isPWA,
    getCurrentPlayback,
  } = useSpotifyPlayer();

  const isMobile = useIsMobile();
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('floating-player-minimized');
    return saved === 'true';
  });
  const [isDragging, setIsDragging] = useState(false);
  const [playerPosition, setPlayerPosition] = useState({ x: 20, y: 20 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMuted, setIsMuted] = useState(false);
  const [savedVolume, setSavedVolume] = useState(0.5);
  const [isPlayerHidden, setIsPlayerHidden] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('floating-player-visible');
    return saved !== null ? saved === 'false' : false;
  });
  const playerRef = useRef<HTMLDivElement>(null);
  const [localPosition, setLocalPosition] = useState(0);
  const [isActionCooldown, setIsActionCooldown] = useState(false);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { track, isPlaying, position, duration, volume } = playerState;

  // Listen for visibility changes from settings
  useEffect(() => {
    const handleVisibilityChange = (event: CustomEvent<{ visible: boolean }>) => {
      setIsPlayerHidden(!event.detail.visible);
    };

    window.addEventListener('player-visibility-change', handleVisibilityChange as EventListener);
    return () => {
      window.removeEventListener('player-visibility-change', handleVisibilityChange as EventListener);
    };
  }, []);

  // Derive visibility from track state and user preference (mobile only)
  const isVisible = track !== null && !(isMobile && isPlayerHidden);

  // Save minimized state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('floating-player-minimized', String(isMinimized));
  }, [isMinimized]);

  // Trigger playback check when component mounts on mobile/PWA
  useEffect(() => {
    if (isMobile || isPWA) {
      getCurrentPlayback();
    }
  }, [isMobile, isPWA, getCurrentPlayback]);

  // Sync local position with player state
  useEffect(() => {
    setLocalPosition(position);
  }, [position]);

  // Real-time position updates when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setLocalPosition((prev) => {
        const next = prev + 1000;
        return next >= duration ? duration : next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  // Throttled action handler with cooldown
  const throttledAction = useCallback((action: () => void, cooldownMs: number = 500) => {
    if (isActionCooldown) return;
    
    setIsActionCooldown(true);
    action();
    
    setTimeout(() => {
      setIsActionCooldown(false);
    }, cooldownMs);
  }, [isActionCooldown]);

  // Throttled button handlers
  const handleTogglePlay = useCallback(() => {
    throttledAction(() => togglePlay(), 500);
  }, [throttledAction, togglePlay]);

  const handleNextTrack = useCallback(() => {
    throttledAction(() => nextTrack(), 800);
  }, [throttledAction, nextTrack]);

  const handlePreviousTrack = useCallback(() => {
    throttledAction(() => previousTrack(), 800);
  }, [throttledAction, previousTrack]);

  // Handle drag (desktop only)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return; // Disable dragging on mobile
    setIsDragging(true);
    setDragStart({
      x: e.clientX - playerPosition.x,
      y: e.clientY - playerPosition.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragStart.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragStart.y));

      setPlayerPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // Debounced volume handler
  const handleVolumeChange = useCallback((newVolume: number) => {
    // Update UI immediately
    if (newVolume > 0) {
      setIsMuted(false);
      setSavedVolume(newVolume);
    } else {
      setIsMuted(true);
    }
    
    // Debounce API call
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }
    
    volumeTimeoutRef.current = setTimeout(() => {
      setVolume(newVolume);
    }, 300);
  }, [setVolume]);

  const toggleMute = useCallback(() => {
    throttledAction(() => {
      if (isMuted) {
        setVolume(savedVolume);
        setIsMuted(false);
      } else {
        setSavedVolume(volume);
        setVolume(0);
        setIsMuted(true);
      }
    }, 400);
  }, [throttledAction, isMuted, savedVolume, volume, setVolume]);

  // Debounced seek handler
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newPosition = Math.floor((percentage / 100) * duration);
    
    // Update UI immediately
    setLocalPosition(newPosition);
    
    // Debounce API call
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }
    
    seekTimeoutRef.current = setTimeout(() => {
      seek(newPosition);
    }, 300);
  }, [duration, seek]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
      if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
    };
  }, []);

  if (!isVisible || !track) return null;

  const progressPercentage = duration > 0 ? (localPosition / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        ref={playerRef}
        className={cn(
          "fixed z-[100] bg-[#111111] border border-white/10 shadow-2xl backdrop-blur-sm pointer-events-auto",
          isDragging && "cursor-grabbing",
          isMobile ? "left-0 right-0 bottom-0 rounded-t-2xl" : "rounded-2xl",
          className
        )}
        style={isMobile ? { 
          paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' 
        } : { 
          left: playerPosition.x, 
          top: playerPosition.y 
        }}
        initial={{ opacity: 0, scale: isMobile ? 1 : 0.8, y: isMobile ? 100 : 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: isMobile ? 1 : 0.8, y: isMobile ? 100 : 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Drag handle (desktop only) */}
        {!isMobile && (
          <div
            className="absolute top-0 left-0 right-0 h-8 cursor-grab active:cursor-grabbing z-0"
            onMouseDown={handleMouseDown}
          />
        )}

        {/* Header */}
        {!isMinimized && (
          <div className="relative z-10 flex items-center justify-between px-4 pt-3 pb-1">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-white/60">Now Playing</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white/60 hover:text-white"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          </div>
        )}

        <motion.div
          className="relative z-10 p-4 pt-2"
          initial={false}
          animate={{ height: isMinimized ? "auto" : "auto" }}
        >
          <div className="flex flex-col gap-4">
            {/* Track Info */}
            <div className="flex items-center gap-3">
              <div className={cn("relative rounded-lg overflow-hidden bg-white/10", isMinimized ? "h-12 w-12" : "h-14 w-14")}>
                {track.album.images[0]?.url ? (
                  <Image
                    src={track.album.images[0].url}
                    alt={track.album.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-linear-to-br from-green-500 to-green-600">
                    <Music className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{track.name}</p>
                <p className="text-xs text-white/60 truncate">{track.artists.map(a => a.name).join(", ")}</p>
              </div>
              {isMinimized && (
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    size="icon"
                    className="h-8 w-8 rounded-full bg-green-500 hover:bg-green-600 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleTogglePlay}
                    disabled={isActionCooldown}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 fill-current" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white/60 hover:text-white"
                    onClick={() => setIsMinimized(false)}
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Minimized Progress Bar */}
            {isMinimized && (
              <div
                className="h-1 bg-white/20 rounded-full cursor-pointer relative overflow-hidden"
                onClick={handleSeek}
              >
                <motion.div
                  className="absolute top-0 left-0 h-full bg-green-500 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              </div>
            )}

            {/* Progress Bar */}
            {!isMinimized && (
              <div className="space-y-1">
                <div
                  className="h-1 bg-white/20 rounded-full cursor-pointer relative overflow-hidden"
                  onClick={handleSeek}
                >
                  <motion.div
                    className="absolute top-0 left-0 h-full bg-green-500 rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>{formatTime(localPosition)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}

            {/* Controls */}
            {!isMinimized && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handlePreviousTrack}
                  disabled={isActionCooldown}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleTogglePlay}
                  disabled={isActionCooldown}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 fill-current" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleNextTrack}
                  disabled={isActionCooldown}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Volume */}
            {!isMinimized && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white/60 hover:text-white"
                  onClick={toggleMute}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-3 w-3" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                </Button>
                <div className="flex-1 h-1 bg-white/20 rounded-full cursor-pointer relative"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                    handleVolumeChange(percentage / 100);
                  }}
                >
                  <div
                    className="absolute top-0 left-0 h-full bg-white/60 rounded-full"
                    style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};