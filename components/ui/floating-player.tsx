"use client";

import React, { useState, useEffect, useRef } from "react";
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [playerPosition, setPlayerPosition] = useState({ x: 20, y: 20 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMuted, setIsMuted] = useState(false);
  const [savedVolume, setSavedVolume] = useState(0.5);
  const playerRef = useRef<HTMLDivElement>(null);

  const { track, isPlaying, position, duration, volume } = playerState;

  // Derive visibility from track state
  const isVisible = track !== null;

  // Load minimized state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('floating-player-minimized');
    if (savedState !== null) {
      setIsMinimized(savedState === 'true');
    }
  }, []);

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

  // Handle volume
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
      setSavedVolume(newVolume);
    } else {
      setIsMuted(true);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(savedVolume);
      setIsMuted(false);
    } else {
      setSavedVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  // Handle seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newPosition = Math.floor((percentage / 100) * duration);
    seek(newPosition);
  };

  if (!isVisible || !track) return null;

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        ref={playerRef}
        className={cn(
          "fixed z-50 bg-[#111111] border border-white/10 shadow-2xl backdrop-blur-sm",
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
            className="absolute top-0 left-0 right-0 h-8 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
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
            {isMinimized ? (
              <Maximize2 className="h-3 w-3" />
            ) : (
              <Minimize2 className="h-3 w-3" />
            )}
          </Button>
        </div>

        <motion.div
          className="p-4 pt-2"
          initial={false}
          animate={{ height: isMinimized ? "auto" : "auto" }}
        >
          <div className="flex flex-col gap-4">
            {/* Track Info */}
            <div className="flex items-center gap-3">
              {!isMinimized && (
                <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-white/10">
                  {track.album.images[0]?.url ? (
                    <Image
                      src={track.album.images[0].url}
                      alt={track.album.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600">
                      <Music className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{track.name}</p>
                <p className="text-xs text-white/60 truncate">{track.artists.map(a => a.name).join(", ")}</p>
              </div>
            </div>

            {/* Progress Bar */}
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
                <span>{formatTime(position)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80 hover:text-white"
                onClick={previousTrack}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600 text-black"
                onClick={togglePlay}
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
                className="h-8 w-8 text-white/80 hover:text-white"
                onClick={nextTrack}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Volume */}
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
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};