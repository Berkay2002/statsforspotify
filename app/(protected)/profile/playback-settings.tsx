"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useSpotifyPlayer } from "@/lib/spotify/player-context";
import { Music, Smartphone, Check, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

export function PlaybackSettings() {
  const { playbackPreference, setPlaybackPreference, isPWA } = useSpotifyPlayer();
  const isMobile = useIsMobile();
  const [localPreference, setLocalPreference] = useState<'in-app' | 'spotify-app' | null>(
    playbackPreference
  );
  const [isPlayerVisible, setIsPlayerVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('floating-player-visible');
    return saved !== null ? saved === 'true' : true;
  });

  const handlePreferenceChange = (value: 'in-app' | 'spotify-app') => {
    setLocalPreference(value);
    setPlaybackPreference(value);
  };

  const handleVisibilityChange = (visible: boolean) => {
    setIsPlayerVisible(visible);
    localStorage.setItem('floating-player-visible', String(visible));
    // Dispatch custom event to notify FloatingPlayer
    window.dispatchEvent(new CustomEvent('player-visibility-change', { detail: { visible } }));
  };

  return (
    <div className="space-y-6">
      {/* Player Visibility Toggle (Mobile Only, only when using Spotify app) */}
      {isMobile && isPWA && localPreference === 'spotify-app' && (
        <>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              {isPlayerVisible ? (
                <Eye className="h-5 w-5 text-green-500" />
              ) : (
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="space-y-0.5">
                <Label htmlFor="player-visibility" className="text-sm font-medium cursor-pointer">
                  Show Floating Player
                </Label>
                <p className="text-xs text-muted-foreground">
                  Hide player since you&apos;re using the Spotify app
                </p>
              </div>
            </div>
            <Switch
              id="player-visibility"
              checked={isPlayerVisible}
              onCheckedChange={handleVisibilityChange}
            />
          </div>
          <Separator />
        </>
      )}

      {/* Playback Preference (PWA Only) */}
      {!isPWA ? (
        <div className="rounded-lg border border-dashed p-4">
          <p className="text-sm text-muted-foreground">
            Playback preferences are available when using Stats for Spotify as a PWA (Progressive Web App).
            Install the app to access this feature.
          </p>
        </div>
      ) : (
        <RadioGroup
      value={localPreference || 'in-app'}
      onValueChange={(value) => handlePreferenceChange(value as 'in-app' | 'spotify-app')}
      className="space-y-3"
    >
      <div
        className={cn(
          "relative flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-all hover:bg-accent/50",
          localPreference === 'in-app' && "border-primary bg-accent/30"
        )}
        onClick={() => handlePreferenceChange('in-app')}
      >
        <RadioGroupItem value="in-app" id="in-app" className="mt-0.5" />
        <div className="flex-1 space-y-1">
          <Label htmlFor="in-app" className="cursor-pointer font-medium flex items-center gap-2">
            <Music className="h-4 w-4 text-green-500" />
            Play in Stats for Spotify
            {localPreference === 'in-app' && (
              <Check className="h-4 w-4 text-primary ml-auto" />
            )}
          </Label>
          <p className="text-xs text-muted-foreground">
            Use the built-in web player. Play music directly in the app with full playback controls.
          </p>
        </div>
      </div>

      <div
        className={cn(
          "relative flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-all hover:bg-accent/50",
          localPreference === 'spotify-app' && "border-primary bg-accent/30"
        )}
        onClick={() => handlePreferenceChange('spotify-app')}
      >
        <RadioGroupItem value="spotify-app" id="spotify-app" className="mt-0.5" />
        <div className="flex-1 space-y-1">
          <Label htmlFor="spotify-app" className="cursor-pointer font-medium flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-green-500" />
            Open in Spotify App
            {localPreference === 'spotify-app' && (
              <Check className="h-4 w-4 text-primary ml-auto" />
            )}
          </Label>
          <p className="text-xs text-muted-foreground">
            Open tracks in the Spotify mobile app. Better for offline listening and native features.
          </p>
        </div>
      </div>
    </RadioGroup>
      )}
    </div>
  );
}
