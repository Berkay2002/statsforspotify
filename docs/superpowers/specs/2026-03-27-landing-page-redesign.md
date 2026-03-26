# Landing Page Redesign

## Overview

Redesign `app/(public)/page.tsx` from a basic hero + 3 feature cards into a visually striking, dark Spotify-native landing page with clean SaaS-style structure. Primary server component file (`page.tsx`) with inline sub-components, plus two small client components: one for framer-motion entrance animations, one for the mock dashboard card (needs `onError` handler on images).

## Design Direction

**Vibe**: Dark & immersive Spotify aesthetic + clean SaaS structure (Spotify meets Linear). Deep dark backgrounds, Spotify green accents (use `text-primary`/`bg-primary` where possible, fall back to `#1DB954` for custom elements), bold typography (project's configured `--font-sans`), subtle green glow effects, glassmorphism cards with `bg-white/[0.03-0.06]` backgrounds and fine borders.

## Page Sections (top to bottom)

### 1. Header (existing PublicLayout — no changes)

Handled by `PublicLayout` wrapper. Logo left, "Go to Dashboard" button right.

### 2. Hero Section — Split Layout

**Reauth alert**: Preserve existing `?reauth=spotify` query param handling. When present, render the destructive `Alert` at the top of the hero section (above the badge), same as current behavior.

**Left side:**
- Badge pill: "Your Music. Your Data." — green text, green-tinted background, rounded pill
- Heading: "Track Your Music Journey" — large (4xl-6xl), bold (900 weight), tight letter-spacing. "Music Journey" in Spotify green
- Subtitle: existing copy — muted color, max-width constrained
- CTA: `LoginDialog`-wrapped button with Spotify logo icon, green background (#1DB954), black text, pill-shaped (full rounded)
- Sub-text: "Free forever · No credit card required" in muted small text

**Right side — Mock Dashboard Card:**
- Card with glassmorphism styling (subtle bg, fine border, rounded-xl)
- Header row: "Your Top Artists" label + "Last 4 Weeks" badge
- 4 artist rows, each with:
  - Rank number (muted)
  - Artist avatar: **hardcoded Spotify CDN image URLs** with `next/image`, `onError` fallback to gradient-filled div
  - Artist name (bold) + genre (muted, small)
  - Horizontal bar showing relative ranking (green gradient fill)
- Sample artists (implementer picks 4 well-known artists, provides name/genre/CDN URL for each)
- Below the card: 3 stat boxes in a row — "50+ Artists", "50+ Tracks", "3 Time Ranges"
- Subtle radial green glow behind the entire visual (CSS pseudo-element)

### 3. Bento Feature Grid

- Section label: "FEATURES" (green, uppercase, letter-spaced)
- Section title: "Everything you need to know about your music taste"
- Asymmetric CSS grid (3 columns, use explicit `grid-column`/`grid-row` placement — auto-flow will not produce correct layout):
  - **Wide card (cols 1-2, row 1)**: "Detailed Analytics" — mini ranking list visual with colored dots and fill bars
  - **Tall card (col 3, rows 1-2)**: "Historical Tracking" — snapshot timeline with dated entries, green accent on most recent
  - **Wide card (cols 1-2, row 2)**: "Trend Visualization" — mini bar chart with varying heights and green gradient
- Each card: label (green uppercase), title, description, visual mockup
- Hover effect: border color transitions to green-tinted

### 4. How It Works

- Section label: "HOW IT WORKS" (green, uppercase)
- Section title: "Three simple steps"
- 3 steps in a horizontal row with connecting lines:
  1. **Connect Spotify** — "Sign in with your Spotify account. We only request read access to your listening data."
  2. **We Snapshot** — "We automatically capture your top artists, tracks, and albums at regular intervals."
  3. **See Your Trends** — "Watch how your music taste evolves with beautiful charts and rankings over time."
- Each step: numbered circle (green-tinted bg, green border, green text), title, description
- Dashed/gradient connector lines between steps

### 5. Social Proof / Bottom CTA

- Row with: Spotify icon + "Powered by Spotify" | "Free forever" | "Privacy-first"
- Secondary CTA button: "Start tracking your music journey →" (green-tinted, outline style, wraps `LoginDialog`)

### 6. Footer (existing PublicLayout — no changes)

Handled by `PublicLayout` wrapper.

## Technical Details

### File Structure

- `app/(public)/page.tsx` — main page, server component. Contains all section markup and inline sub-components
- `components/animated-section.tsx` — `"use client"` wrapper for framer-motion scroll-triggered entrance animations
- `components/mock-dashboard-card.tsx` — `"use client"` component for the hero's mock dashboard preview (needs `onError` handler on `next/image` for artist photo fallbacks)

### Existing Components Retained

- `PublicLayout` — page wrapper (no changes)
- `LoginDialog` — wraps both CTA buttons (hero + bottom)
- `SpotifyLogo` — used in hero CTA button
- `SpotifyAttribution` — no longer imported; replaced by inline social proof row (Spotify attribution text still present in the new section)
- `AuthRedirect` — kept for authenticated user redirect
- `Alert` components — kept for reauth warning

### Animation Strategy

- One client component wrapper (e.g., `AnimatedSection`) using framer-motion
- Scroll-triggered entrance animations: fade-in + slide-up with staggered delays
- Subtle hover effects on bento cards (CSS only, no framer-motion needed)
- Keep animations light — entrance only, no continuous animations

### Artist Images

- Hardcode 4 Spotify CDN image URLs for well-known artists
- Use `next/image` with `onError` handler that swaps `src` to a transparent pixel and shows gradient fallback via CSS
- Fallback: gradient-filled circle (each artist gets a unique gradient)
- Images are decorative only — `alt` text still set for accessibility

### Responsive Behavior

- Hero: stacks vertically on mobile (text above, visual below)
- Bento grid: collapses to single column on mobile
- How It Works: stacks vertically on mobile, connectors hidden
- Stats row: wraps to 3-across on all sizes (already compact)

### Dependencies

- `framer-motion` (already installed)
- `next/image` (already available)
- `lucide-react` icons: `BarChart3`, `Clock`, `TrendingUp` can be reused or swapped
- No new packages needed
