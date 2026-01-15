"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSpotifyPlayer } from "@/lib/spotify/player-context";
import { Music, Smartphone, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlaybackSettings() {
  const { playbackPreference, setPlaybackPreference, isPWA } = useSpotifyPlayer();
  const [localPreference, setLocalPreference] = useState<'in-app' | 'spotify-app' | null>(
    playbackPreference
  );

  const handlePreferenceChange = (value: 'in-app' | 'spotify-app') => {
    setLocalPreference(value);
    setPlaybackPreference(value);
  };

  // Only show for PWA users
  if (!isPWA) {
    return (
      <div className="rounded-lg border border-dashed p-4">
        <p className="text-sm text-muted-foreground">
          Playback preferences are available when using Stats for Spotify as a PWA (Progressive Web App).
          Install the app to access this feature.
        </p>
      </div>
    );
  }

  return (
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
  );
}
