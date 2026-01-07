# Spotify Stats Tracking App - Technical Documentation

## Project Overview

Building a web application similar to statsforspotify.com that tracks user's Spotify listening history over time, including:
- Top artists, tracks, and albums
- Historical ranking changes (e.g., tracking how Bruno Mars moved from rank 38 to rank 4 over 2 months)
- Daily/weekly snapshots for time-series visualizations

**Target Users:** Small user base (<25 users) - yourself and friends

---

## 1. Legal & Compliance Requirements

### Development Mode Limits
- In development mode, you can have up to **25 users** without requesting extended quota
- Extended quota requires company status, but individual developers can build apps for small user groups
- This is perfect for a personal project with friends

### Data Storage Rules

You **can** store user data for historical tracking, but must follow these strict conditions:

- Store only data "strictly necessary to operate your SDA" (Spotify Developer Application)
- Provide users an easily accessible mechanism to disconnect their Spotify account and delete their data
- When users disconnect, you **must delete all their personal data**
- Delete data for inactive users
- Implement industry-standard security measures

### Required Legal Components

You must provide:

1. **Privacy Policy** - Displayed before signup, explaining:
   - What data you collect
   - How you use it
   - How users can delete their data

2. **End User Agreement** - Must:
   - Disclaim Spotify's liability
   - State that you're responsible for your app

3. **Data Deletion Instructions** - Clear instructions for users to disconnect and delete their data

### Implementation Compliance

Your proposed architecture is **legal and compliant**:
- Users link Spotify accounts through OAuth
- Backend periodically fetches top artists/tracks via API
- Store snapshots in your database
- Display historical trends

This falls within "private personal use" allowed by the license and counts as necessary storage for app functionality.

---

## 2. Spotify API Integration

### Required API References

For a stats tracking app, you need these Spotify Web API references:

- **Users** - Primary API for personalization endpoints (`/me/top/artists`, `/me/top/tracks`)
- **Tracks** - Fetch detailed track information, audio features, album associations
- **Artists** - Get artist details, metadata, and top tracks
- **Albums** - Display top albums (extract from top tracks, then fetch album details)

### Authentication with Supabase

#### Adding Spotify Scopes

```javascript
await supabase.auth.signInWithOAuth({
  provider: 'spotify',
  options: {
    scopes: 'user-top-read user-read-recently-played',
    redirectTo: 'http://yourapp.com/callback'
  }
})
```

The `user-top-read` scope provides access to top artists, tracks, and albums.

#### Accessing the Tokens

After authentication, Supabase stores the Spotify access token in the session object:

```javascript
const { data: { session } } = await supabase.auth.getSession()

const spotifyAccessToken = session.provider_token
const spotifyRefreshToken = session.provider_refresh_token
```

#### Making API Calls

Use `provider_token` to make API calls directly to Spotify's endpoints:

```javascript
const response = await fetch('https://api.spotify.com/v1/me/top/artists', {
  headers: {
    'Authorization': `Bearer ${session.provider_token}`
  }
})
```

#### Token Refresh

- Provider tokens aren't stored in Supabase's database for security reasons
- When the access token expires, call `supabase.auth.refreshSession()` to get a new `provider_token`
- You may need to add `access_type: 'offline'` and `prompt: 'consent'` to OAuth query parameters to ensure you receive refresh tokens

### Spotify API Rate Limits

**Important Considerations:**

- Spotify uses a **rolling 30-second window** for rate limiting
- In development mode, the exact limit isn't publicly specified (lower than extended quota mode)
- You'll get `429` errors if you exceed the limit, with a `Retry-After` header
- With <25 users and daily snapshots, you'll make **~75-150 API calls per run** (3 requests per user for artists/tracks/albums)
- **Solution:** Spread out your snapshot collection or add delays between users to stay under the limit

### Historical Ranking Data

**Important:** Spotify's Web API does **not provide historical ranking data** or track artist popularity over time.

To build rank history features, you must:
1. Periodically poll the relevant endpoints yourself
2. Store the data in your own database
3. Build the historical tracking functionality on your backend

The Spotify API only provides current snapshot data, not historical trends.

---

## 3. Database Schema Design

### Core Tables

#### `snapshots` Table

```sql
CREATE TABLE snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  snapshot_date TIMESTAMP NOT NULL DEFAULT NOW(),
  time_range TEXT NOT NULL CHECK (time_range IN ('short_term', 'medium_term', 'long_term'))
);
```

This table stores when each snapshot was taken.

#### `artist_rankings` Table

```sql
CREATE TABLE artist_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id UUID REFERENCES snapshots(id) ON DELETE CASCADE NOT NULL,
  spotify_artist_id TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  popularity INTEGER
);
```

#### `track_rankings` Table

```sql
CREATE TABLE track_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id UUID REFERENCES snapshots(id) ON DELETE CASCADE NOT NULL,
  spotify_track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  popularity INTEGER
);
```

#### `album_rankings` Table

```sql
CREATE TABLE album_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id UUID REFERENCES snapshots(id) ON DELETE CASCADE NOT NULL,
  spotify_album_id TEXT NOT NULL,
  album_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  popularity INTEGER
);
```

### Why This Design Works

- Stores **complete snapshots** at each interval rather than just changes
- For your small dataset (<25 users × ~50 top items × daily snapshots), this is more efficient than temporal database complexity
- You'll accumulate roughly **25 users × 150 items × 365 days = ~1.4M rows per year**, which PostgreSQL handles easily with proper indexing

### Querying for Graphs

Example: Get Bruno Mars's ranking over time:

```sql
SELECT s.snapshot_date, ar.rank 
FROM artist_rankings ar
JOIN snapshots s ON ar.snapshot_id = s.id
WHERE ar.spotify_artist_id = 'bruno_mars_id' 
  AND s.user_id = 'user_id'
ORDER BY s.snapshot_date ASC;
```

### Optimization & Indexes

Create these indexes for optimal performance:

```sql
-- Fast time-range queries
CREATE INDEX idx_snapshots_user_date ON snapshots(user_id, snapshot_date);

-- Artist-specific queries
CREATE INDEX idx_artist_rankings_spotify_id ON artist_rankings(spotify_artist_id, snapshot_id);

-- Track-specific queries
CREATE INDEX idx_track_rankings_spotify_id ON track_rankings(spotify_track_id, snapshot_id);

-- Album-specific queries
CREATE INDEX idx_album_rankings_spotify_id ON album_rankings(spotify_album_id, snapshot_id);
```

---

## 4. Automated Snapshot Collection

### Supabase Cron Jobs

Supabase has built-in cron functionality using `pg_cron` that lets you schedule recurring tasks.

#### Creating a Daily Cron Job

Via SQL:

```sql
SELECT cron.schedule(
  'daily-spotify-snapshots',
  '0 3 * * *',  -- Run at 3 AM daily
  'SELECT fetch_all_user_snapshots()'
);
```

Or via the Supabase Dashboard under Database > Cron Jobs.

#### Required Database Function

You'll need to create a database function that:

1. Loops through active users
2. Refreshes their tokens if needed (using stored refresh tokens)
3. Calls the Spotify API for each user
4. Inserts the snapshot data into the database

Example structure (pseudo-code):

```sql
CREATE OR REPLACE FUNCTION fetch_all_user_snapshots()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, provider_refresh_token FROM auth.users 
    WHERE provider = 'spotify' AND last_sign_in_at > NOW() - INTERVAL '30 days'
  LOOP
    -- Call Edge Function or external service to:
    -- 1. Refresh token
    -- 2. Fetch Spotify data
    -- 3. Insert snapshot records
    PERFORM http_post(
      'https://your-edge-function.supabase.co/snapshot-user',
      json_build_object('user_id', user_record.id)
    );

    -- Add delay to respect rate limits
    PERFORM pg_sleep(2);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

**Note:** Since `pg_cron` runs in the database context, you'll likely need to call a Supabase Edge Function that handles the OAuth token refresh and Spotify API calls.

---

## 5. Frontend Architecture

### Recommended Tech Stack

Since you're familiar with **Next.js and TypeScript**, here's the recommended stack:

- **Next.js App Router** with server components for initial data fetching
- **Client components** for interactive graphs (use Recharts, Chart.js, or Victory for time-series visualizations)
- **Server actions** to trigger manual snapshot updates
- **Supabase Realtime** subscriptions to show live updates when cron jobs complete

### Example Project Structure

```
app/
├── (auth)/
│   ├── login/
│   └── callback/
├── dashboard/
│   ├── page.tsx              # Main dashboard
│   ├── artists/
│   │   └── [id]/page.tsx     # Artist detail with ranking history
│   ├── tracks/
│   │   └── [id]/page.tsx     # Track detail with ranking history
│   └── albums/
│       └── [id]/page.tsx     # Album detail with ranking history
├── profile/
│   └── page.tsx              # User settings, data deletion
└── api/
    └── snapshot/
        └── route.ts          # Manual snapshot trigger

components/
├── charts/
│   ├── RankingChart.tsx      # Time-series line chart
│   ├── TopItemsList.tsx      # Current rankings list
│   └── ComparisonChart.tsx   # Multi-user comparison
└── ui/
    └── ...                   # UI components

lib/
├── supabase/
│   ├── client.ts
│   └── server.ts
└── spotify/
    ├── api.ts                # Spotify API wrapper
    └── types.ts              # TypeScript types
```

### Key Components

#### Authentication Flow

```typescript
// app/(auth)/login/page.tsx
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        scopes: 'user-top-read user-read-recently-played',
        redirectTo: `${window.location.origin}/callback`
      }
    })
  }

  return <button onClick={handleLogin}>Login with Spotify</button>
}
```

#### Fetching User Stats

```typescript
// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get latest snapshot
  const { data: latestSnapshot } = await supabase
    .from('snapshots')
    .select('*, artist_rankings(*)')
    .eq('user_id', user.id)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  return <TopArtistsList rankings={latestSnapshot.artist_rankings} />
}
```

#### Real-time Updates

```typescript
// components/RealtimeUpdates.tsx
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function RealtimeUpdates({ userId }: { userId: string }) {
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('snapshot-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'snapshots',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('New snapshot created!', payload)
          // Refresh data or show notification
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return null
}
```

---

## 6. Additional Features to Consider

### Core Features

1. **Comparison Views**
   - Let users compare their stats with friends
   - Side-by-side ranking comparisons
   - Shared artists/tracks discovery

2. **Milestones/Notifications**
   - Alert users when an artist breaks into their top 10
   - Notify when a song they loved drops out of top 50
   - Celebrate when they discover a new favorite artist

3. **Export Functionality**
   - Let users download their historical data (CSV/JSON)
   - **Required for GDPR compliance**
   - Include all snapshots and rankings

4. **Manual Snapshot Trigger**
   - Allow users to create snapshots on-demand in addition to automated ones
   - Useful for capturing special moments or before major events

### Advanced Features

- **Listening Insights**
  - Genre distribution over time
  - Discovery rate (new artists per month)
  - Loyalty metrics (how long artists stay in top rankings)

- **Social Features**
  - Friend leaderboards
  - Shared playlists based on common top tracks
  - Activity feed showing friends' milestone achievements

- **Prediction Features**
  - Predict next month's top artists based on trends
  - Identify rising stars before they hit mainstream

---

## 7. Implementation Checklist

### Phase 1: Setup & Authentication
- [ ] Create Supabase project
- [ ] Configure Spotify OAuth provider in Supabase
- [ ] Create Next.js app with TypeScript
- [ ] Implement Spotify login flow
- [ ] Test token retrieval and refresh

### Phase 2: Database Schema
- [ ] Create database tables (snapshots, artist_rankings, track_rankings, album_rankings)
- [ ] Add indexes for optimization
- [ ] Set up Row Level Security (RLS) policies
- [ ] Create data deletion function for user account removal

### Phase 3: Data Collection
- [ ] Build Supabase Edge Function for fetching Spotify data
- [ ] Implement token refresh logic
- [ ] Create manual snapshot trigger endpoint
- [ ] Set up pg_cron for automated daily snapshots
- [ ] Add rate limiting and error handling

### Phase 4: Frontend Development
- [ ] Build dashboard with current rankings
- [ ] Create artist/track/album detail pages
- [ ] Implement time-series charts for ranking history
- [ ] Add real-time updates with Supabase Realtime
- [ ] Build comparison views

### Phase 5: Legal & Compliance
- [ ] Write privacy policy
- [ ] Create end user agreement
- [ ] Add data deletion UI
- [ ] Implement export functionality
- [ ] Add disconnect Spotify account feature

### Phase 6: Polish & Launch
- [ ] Add loading states and error handling
- [ ] Optimize performance
- [ ] Test with multiple users
- [ ] Deploy to production (Vercel recommended)
- [ ] Monitor rate limits and API usage

---

## 8. Useful Resources

### Documentation
- [Spotify Web API Reference](https://developer.spotify.com/documentation/web-api/reference)
- [Supabase Auth with Spotify](https://supabase.com/docs/guides/auth/social-login/auth-spotify)
- [Supabase Cron Jobs](https://supabase.com/modules/cron)
- [Next.js App Router](https://nextjs.org/docs/app)

### Developer Terms
- [Spotify Developer Terms](https://developer.spotify.com/terms)
- [Spotify Developer Policy](https://developer.spotify.com/policy)

### Tutorials
- [Build a Real-Time Spotify Dashboard with Next.js](https://dev.to/adityathakekar/build-a-real-time-spotify-dashboard-with-nextjs-part-1-the-auth-297e)
- [Next.js Beginner Tutorial Using Spotify API](https://whitep4nth3r.com/blog/next-js-beginner-tutorial-using-spotify-api/)

---

## Notes

- Remember to stay under 25 users in development mode
- Implement proper error handling for API rate limits
- Always provide users with data deletion options
- Consider starting with weekly snapshots before moving to daily
- Test token refresh logic thoroughly to avoid auth failures

---

**Last Updated:** January 7, 2026
