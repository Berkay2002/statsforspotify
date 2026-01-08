# Performance Optimizations

This document outlines the performance optimizations implemented in the Stats for Spotify application.

## Overview

The application has been optimized to reduce redundant API calls, improve caching, and enhance the user experience through faster page loads and smoother interactions.

## Key Optimizations

### 1. Request Deduplication with React `cache()`

All Spotify API functions and Supabase client creation are wrapped with React's `cache()` function. This prevents duplicate API calls within the same server render.

**Files affected:**
- `lib/spotify/api.ts` - All exported functions wrapped with `cache()`
- `lib/supabase/server.ts` - `createClient()` wrapped with `cache()`

**Benefits:**
- If multiple components request the same data during server rendering, only one API call is made
- Reduces API rate limit pressure
- Improves page load times

### 2. Reduced API Calls through Data Reuse

#### Dashboard Page Optimization
**Before:** 9 API calls (3 time ranges × 3 data types)
**After:** 6 API calls (33% reduction)

The dashboard now:
1. Fetches artists and tracks for all time ranges in parallel
2. Derives genres from already-fetched artists (no additional API calls)

#### Albums Page Optimization
**Before:** 6 API calls (3 time ranges × 2: tracks + albums)
**After:** 3 API calls (50% reduction)

Albums are derived from tracks, so we now:
1. Fetch tracks for all time ranges in parallel
2. Extract albums from already-fetched tracks

### 3. Client-Side Navigation for Better UX

#### Genres Page Optimization
**Before:** Server-side navigation between time ranges (full page reload)
**After:** Client-side tab switching (instant transitions)

The genres page now fetches all time ranges on initial load and switches between them client-side, eliminating server round-trips.

### 4. Parallel Sparkline Loading

**Before:** Nested SparklineLoader components loading sequentially
**After:** Combined loader fetching both datasets in parallel

Created `CombinedSparklineLoader` component that fetches artist and track sparklines simultaneously.

### 5. Next.js Caching Strategy

All Spotify API fetches now include Next.js caching options:

```typescript
next: { 
  revalidate: 60, // Cache for 60 seconds
  tags: ['spotify-api'] // For potential cache invalidation
}
```

## Performance Metrics

### API Call Reduction
- **Dashboard page**: 33% fewer calls (9 → 6)
- **Albums page**: 50% fewer calls (6 → 3)
- **Genres page**: Eliminated redundant calls on tab switches

### Cache Hit Improvements
- First request: Cache miss, fetches from Spotify
- Subsequent requests within 60s: Cache hit, instant response
- Request deduplication: Single call for multiple components

## Code Quality Improvements

### Shared Components (from PR #4)
- `TimeRangeTabs` - Reusable tabs component
- `SpotifyIcon` - Centralized Spotify SVG
- `loading-skeletons` - Shared loading states
- `lib/constants.ts` - Centralized constants
- `lib/api/utils.ts` - API utility functions

## Best Practices for Future Development

1. **Always use `cache()` for expensive operations**
2. **Prefer parallel fetching over sequential**
3. **Reuse data when possible**
4. **Consider client-side state for static data**
5. **Add appropriate cache durations**
