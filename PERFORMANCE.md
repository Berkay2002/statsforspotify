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

**Example:**
```typescript
export const getTopArtists = cache(async (
  timeRange: TimeRange = "medium_term",
  limit: number = 50
): Promise<RankedArtist[]> => {
  // Function body...
});
```

### 2. Reduced API Calls through Data Reuse

#### Dashboard Page Optimization
**Before:** 9 API calls (3 time ranges × 3 data types)
**After:** 6 API calls (33% reduction)

The dashboard now:
1. Fetches artists and tracks for all time ranges in parallel
2. Derives genres from already-fetched artists (no additional API calls)

**File:** `app/(protected)/dashboard/page.tsx`

```typescript
// Fetch base data
const [artists, tracks] = await Promise.all([...]);

// Derive genres from artists (no additional API calls)
const genres = await Promise.all([
  getTopGenres("short_term", 5, shortTermArtists),
  getTopGenres("medium_term", 5, mediumTermArtists),
  getTopGenres("long_term", 5, longTermArtists),
]);
```

#### Albums Page Optimization
**Before:** 6 API calls (3 time ranges × 2: tracks + albums)
**After:** 3 API calls (50% reduction)

Albums are derived from tracks, so we now:
1. Fetch tracks for all time ranges in parallel
2. Extract albums from already-fetched tracks

**File:** `app/(protected)/dashboard/albums/page.tsx`

```typescript
// Fetch tracks once
const [tracks] = await Promise.all([
  getTopTracks("short_term", 50),
  getTopTracks("medium_term", 50),
  getTopTracks("long_term", 50),
]);

// Extract albums from tracks (no additional API calls)
const albums = await Promise.all([
  getTopAlbums("short_term", 50, shortTermTracks),
  getTopAlbums("medium_term", 50, mediumTermTracks),
  getTopAlbums("long_term", 50, longTermTracks),
]);
```

### 3. Client-Side Navigation for Better UX

#### Genres Page Optimization
**Before:** Server-side navigation between time ranges (full page reload)
**After:** Client-side tab switching (instant transitions)

The genres page now fetches all time ranges on initial load and switches between them client-side, eliminating server round-trips.

**File:** `app/(protected)/dashboard/genres/page.tsx`

**Benefits:**
- Instant tab switching (no loading states)
- Better user experience
- Reduced server load

### 4. Parallel Sparkline Loading

**Before:** Nested SparklineLoader components loading sequentially
**After:** Combined loader fetching both datasets in parallel

Created `CombinedSparklineLoader` component that fetches artist and track sparklines simultaneously.

**Files:**
- `components/charts/combined-sparkline-loader.tsx` (new)
- `components/dashboard-overview.tsx` (updated)

**Benefits:**
- Faster sparkline rendering
- Reduced total loading time
- Better perceived performance

### 5. Next.js Caching Strategy

All Spotify API fetches now include Next.js caching options:

```typescript
next: { 
  revalidate: 60, // Cache for 60 seconds
  tags: ['spotify-api'] // For potential cache invalidation
}
```

**Benefits:**
- Subsequent requests within 60 seconds serve cached data
- Reduces Spotify API usage
- Improves response times

### 6. Optional Pre-fetched Data Parameters

Modified key functions to accept optional pre-fetched data:

```typescript
getTopAlbums(timeRange, limit, prefetchedTracks?)
getTopGenres(timeRange, limit, prefetchedArtists?)
```

**Benefits:**
- Allows parent components to optimize data flow
- Prevents redundant API calls
- More flexible architecture

## Performance Metrics

### API Call Reduction
- **Dashboard page**: 33% fewer calls (9 → 6)
- **Albums page**: 50% fewer calls (6 → 3)
- **Genres page**: Eliminated redundant calls on tab switches

### Cache Hit Improvements
- First request: Cache miss, fetches from Spotify
- Subsequent requests within 60s: Cache hit, instant response
- Request deduplication: Single call for multiple components

## Best Practices for Future Development

1. **Always use `cache()` for expensive operations**
   - Wrap any function that fetches external data
   - Wrap any function that performs heavy computation

2. **Prefer parallel fetching over sequential**
   ```typescript
   // Good: Parallel
   const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()]);
   
   // Bad: Sequential
   const a = await fetchA();
   const b = await fetchB();
   const c = await fetchC();
   ```

3. **Reuse data when possible**
   - If data can be derived from existing data, derive it
   - Pass pre-fetched data to child functions via optional parameters

4. **Consider client-side state for static data**
   - If data doesn't change frequently, fetch once and switch client-side
   - Use tabs/filters client-side when possible

5. **Add appropriate cache durations**
   - Short-lived data: 60 seconds
   - Long-lived data: 5-10 minutes
   - Static data: longer periods

## Monitoring Performance

To monitor the impact of these optimizations:

1. **Check browser Network tab** - Verify API call reduction
2. **Use React DevTools Profiler** - Measure render times
3. **Monitor Spotify API quota** - Should see reduced usage
4. **User experience** - Pages should load faster, especially on repeat visits

## Future Optimization Opportunities

1. **Streaming SSR with Suspense**
   - Use React 19's streaming features
   - Show content progressively as it loads

2. **Service Worker caching**
   - Cache Spotify images locally
   - Offline-first approach for previously loaded data

3. **Database query optimization**
   - Add indexes for frequently queried fields
   - Consider materialized views for complex queries

4. **Image optimization**
   - Use Next.js Image component everywhere
   - Implement responsive image sizes
   - Consider WebP format

5. **Code splitting**
   - Split large components into smaller chunks
   - Lazy load non-critical features
