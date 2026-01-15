"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Music } from "lucide-react";
import { useSpotifyPlayer } from "@/lib/spotify/player-context";

interface PlaybackPreferenceDialogProps {
  open: boolean;
  onClose: () => void;
  trackUri: string;
  onPlayInApp: () => void;
}

export const PlaybackPreferenceDialog: React.FC<PlaybackPreferenceDialogProps> = ({
  open,
  onClose,
  trackUri,
  onPlayInApp,
}) => {
  const { setPlaybackPreference, openInSpotifyApp } = useSpotifyPlayer();
  const [rememberChoice, setRememberChoice] = useState(false);

  const handlePlayInApp = () => {
    if (rememberChoice) {
      setPlaybackPreference('in-app');
    }
    onPlayInApp();
    onClose();
  };

  const handleOpenSpotify = () => {
    if (rememberChoice) {
      setPlaybackPreference('spotify-app');
    }
    openInSpotifyApp(trackUri);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Playback Method</DialogTitle>
          <DialogDescription>
            How would you like to listen to this track?
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 py-4">
          <Button
            onClick={handlePlayInApp}
            variant="outline"
            className="h-auto flex-col items-start p-4 hover:bg-accent"
          >
            <div className="flex items-center gap-3 w-full">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Music className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold">Play in Stats for Spotify</div>
                <div className="text-xs text-muted-foreground">
                  Use the built-in web player
                </div>
              </div>
            </div>
          </Button>

          <Button
            onClick={handleOpenSpotify}
            variant="outline"
            className="h-auto flex-col items-start p-4 hover:bg-accent"
          >
            <div className="flex items-center gap-3 w-full">
              <div className="p-2 rounded-lg bg-primary/10">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold">Open in Spotify App</div>
                <div className="text-xs text-muted-foreground">
                  Continue listening in the Spotify app
                </div>
              </div>
            </div>
          </Button>

          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="rounded border-gray-300"
            />
            Remember my choice for future playback
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
};
