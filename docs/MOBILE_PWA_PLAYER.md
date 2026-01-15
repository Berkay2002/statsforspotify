# Mobile & PWA Spotify Player Implementation

## Overview

The Spotify player has been enhanced with mobile-responsive design and PWA-specific features to provide an optimal playback experience across all devices.

## Features Implemented

### 1. Mobile-Responsive Bottom Player

**Location**: [components/ui/floating-player.tsx](../components/ui/floating-player.tsx)

#### Desktop Behavior:
- Draggable floating player positioned at coordinates `{ x: 20, y: 20 }`
- Full controls with drag handle
- Can be minimized or hidden

#### Mobile Behavior:
- Fixed to bottom of screen (`fixed bottom-0 left-0 right-0`)
- No drag functionality (disabled on mobile)
- Rounded top corners only (`rounded-t-2xl`)
- Safe area insets for iOS PWA (`paddingBottom: 'max(env(safe-area-inset-bottom), 16px)'`)
- Slide up animation from bottom

### 2. PWA Playback Preference System

**Location**: [lib/spotify/player-context.tsx](../lib/spotify/player-context.tsx)

#### Features:
- **PWA Detection**: Automatically detects if app is running as PWA using:
  ```typescript
  window.matchMedia('(display-mode: standalone)').matches
  ```
- **Preference Storage**: Stores user's playback preference in `localStorage`
- **Deep Linking**: Opens Spotify app using deep links (`spotify:track:ID`)
- **Fallback**: Falls back to web player if Spotify app doesn't open

#### New Context Properties:
```typescript
{
  isPWA: boolean;                    // Is app running as PWA?
  playbackPreference: 'in-app' | 'spotify-app' | null;  // User preference
  setPlaybackPreference: (preference) => void;  // Set preference
  openInSpotifyApp: (uri: string) => void;      // Open in Spotify app
}
```

### 3. Playback Preference Dialog

**Location**: [components/playback-preference-dialog.tsx](../components/playback-preference-dialog.tsx)

#### When it appears:
- First time a PWA user on mobile tries to play a track
- Only if no preference has been set yet

#### Options:
1. **Play in Stats for Spotify** - Use the built-in web player
2. **Open in Spotify App** - Redirect to Spotify app (if installed)

#### Remember Choice:
- Checkbox to save preference for future playback
- Stored in `localStorage` as `spotify-playback-preference`

## User Flow

### First-Time PWA User (Mobile)
1. User clicks play button on any track
2. Preference dialog appears with two options
3. User chooses option and optionally checks "Remember my choice"
4. Choice is saved to localStorage
5. Track plays according to preference

### Returning PWA User (Mobile)
- If preference is `'in-app'`: Plays immediately in web player
- If preference is `'spotify-app'`: Opens Spotify app directly
- No dialog shown if preference is set

### Non-PWA Users
- No dialog shown
- Plays in web player (existing behavior)

### Desktop Users
- Draggable floating player with full controls
- No PWA preference system needed

## Technical Implementation

### Mobile Detection
Uses the existing `useIsMobile` hook:
```typescript
const isMobile = useIsMobile(); // Returns true if viewport < 768px
```

### PWA Detection
```typescript
useEffect(() => {
  const isPWAMode = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
  setIsPWA(isPWAMode);
}, []);
```

### Spotify Deep Links
```typescript
// Convert URI to deep link format
const spotifyDeepLink = uri.startsWith('spotify:') 
  ? uri 
  : uri.replace('https://open.spotify.com/', 'spotify:').replace(/\//g, ':');

// Example: spotify:track:3n3Ppam7vgaVa1iaRUc9Lp
```

### Safe Area Insets (iOS PWA)
```typescript
style={{ 
  paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' 
}}
```

This ensures the player doesn't get hidden by iOS home indicator.

## Configuration

### Resetting Preference
Users can reset their playback preference by:
1. Clearing browser data/localStorage
2. Or (future enhancement) adding a settings page to change preference

### localStorage Key
```typescript
const STORAGE_KEY = 'spotify-playback-preference';
```

## Browser Compatibility

### PWA Detection
- ✅ iOS Safari (standalone mode)
- ✅ Android Chrome (display-mode: standalone)
- ✅ Desktop PWAs (Chrome, Edge)

### Deep Linking
- ✅ iOS: `spotify:` protocol supported
- ✅ Android: `spotify:` protocol supported
- ⚠️ Desktop: Opens Spotify desktop app (if installed)

### Safe Area Insets
- ✅ iOS Safari 11.2+
- ✅ Android Chrome (not needed, but doesn't break)
- ✅ Graceful fallback to 16px padding

## Testing

### Manual Testing Checklist

#### Mobile Browser (Non-PWA)
- [ ] Player appears at bottom of screen
- [ ] Player cannot be dragged
- [ ] No preference dialog appears
- [ ] Play/pause works in web player

#### Mobile PWA (First Use)
- [ ] Player appears at bottom of screen
- [ ] Preference dialog appears on first play
- [ ] "Play in Stats for Spotify" option works
- [ ] "Open in Spotify App" redirects correctly
- [ ] "Remember my choice" checkbox works

#### Mobile PWA (With Preference)
- [ ] No dialog appears on subsequent plays
- [ ] Respects saved preference
- [ ] In-app preference uses web player
- [ ] Spotify app preference redirects

#### Desktop Browser
- [ ] Floating player appears at top-left
- [ ] Player is draggable
- [ ] No preference dialog appears
- [ ] Full controls work

#### iOS PWA Specific
- [ ] Bottom padding respects home indicator
- [ ] Player doesn't get cut off
- [ ] Status bar styling is correct

## Future Enhancements

### Potential Improvements
1. **Settings Page**: Allow users to change preference without clearing localStorage
2. **Device Selection**: Choose specific Spotify device for playback
3. **Queue Management**: Add tracks to queue from preference dialog
4. **Picture-in-Picture**: Mini player for background playback
5. **Gesture Controls**: Swipe to skip tracks on mobile
6. **Haptic Feedback**: Vibration feedback on iOS for actions

### Known Limitations
1. Web Playback SDK requires Spotify Premium
2. Deep links may fail if Spotify app not installed (graceful fallback included)
3. PWA detection might not work on all browsers (falls back to in-app player)

## Related Files

- [components/ui/floating-player.tsx](../components/ui/floating-player.tsx) - Main player UI
- [lib/spotify/player-context.tsx](../lib/spotify/player-context.tsx) - Player state & logic
- [components/playback-preference-dialog.tsx](../components/playback-preference-dialog.tsx) - Preference selection
- [hooks/use-mobile.ts](../hooks/use-mobile.ts) - Mobile detection hook
- [app/manifest.ts](../app/manifest.ts) - PWA configuration

## Support

For issues or questions about the mobile/PWA player:
1. Check if running as PWA: Open DevTools → Application → Service Workers
2. Check localStorage: Look for `spotify-playback-preference` key
3. Check console for player initialization errors
4. Verify Spotify Premium account (required for Web Playback SDK)
