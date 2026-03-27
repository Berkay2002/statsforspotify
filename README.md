# Stats for Spotify

A web app to track your Spotify listening history and visualize how your music taste evolves over time.

## Features

### Music Tracking
- **Top Artists, Tracks & Albums** — View your top 50 items across different time ranges (4 weeks, 6 months, all time)
- **Top Genres** — Discover your favorite genres derived from top artists
- **Historical Tracking** — Automatic snapshots save your rankings to track changes over time
- **Trend Visualization** — Recharts-powered line graphs and sparklines showing ranking history
- **Auto-Snapshot Collection** — Rankings are automatically collected when you visit the dashboard (respects 24-hour interval)
- **Rank Change Visualization** — Color-coded badges showing position changes (↑5, ↓3, NEW, —)
  - Inline badges in artist/track/album lists
  - Enhanced charts with colored dots at significant rank changes (±5 positions)
  - Tooltips show previous rank: "Rank 3 (was 8, ↑5)"
  - Progressive enhancement: works with or without historical data

### Social Features
- **Friends System** — Connect with friends who mutually follow you on Spotify
- **Privacy Controls** — Choose who can view your stats (public, friends-only, or private)
- **User Profiles** — Discord-style usernames with discriminators (#0000)
- **Friend Discovery** — Search for users and see follow-back suggestions
- **View Friends' Stats** — Browse your friends' top artists, tracks, and listening history

### Profile & Data
- **Detailed Statistics** — View comprehensive stats including total snapshots, rankings breakdown, and tracking duration
- **Data Portability** — Export all your data as JSON or CSV
- **Data Management** — Delete all your data at any time (Spotify compliance)
- **Profile Customization** — Manage privacy settings and view your listening patterns

### User Experience
- **Dark Mode** — Beautiful dark theme by default with light mode toggle
- **Performance Monitoring** — Integrated Vercel Analytics and Speed Insights
- **Mobile-Friendly** — Responsive design with mobile sidebar support
- **Smooth Animations** — Framer Motion powered transitions and interactions

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Database**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Charts**: Recharts with custom sparklines
- **Animations**: Framer Motion
- **State Management**: TanStack React Query (for social features)
- **Auth**: Spotify OAuth via Supabase
- **Runtime**: Node.js 18+ or Bun

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Supabase project
- Spotify Developer App

### 1. Clone and Install

```bash
git clone <repo-url>
cd statsforspotify
bun install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Set up your database schema:
   - **Option A (Recommended)**: Apply the schema from `supabase/schema/schema.sql`
   - **Option B**: Create tables manually (snapshots, rankings, user profiles, etc.)
3. Enable Row Level Security (RLS) on all tables
4. Go to **Authentication > Providers > Spotify** and configure:
   - Client ID and Secret from your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Callback URL: `https://<your-project>.supabase.co/auth/v1/callback`
   - Add required scopes: `user-read-email`, `user-top-read`, `user-follow-read`, `user-follow-modify`, `streaming`, `user-modify-playback-state`, `user-read-playback-state`

**Note**: The database schema is automatically synchronized from Supabase to this repository via GitHub Actions. See [SCHEMA_SYNC.md](SCHEMA_SYNC.md) for details.

### 3. Configure Environment

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/
│   ├── (public)/           # Landing, login, auth callback, privacy, terms
│   ├── (protected)/        # Dashboard, profile (auth required)
│   │   ├── dashboard/      # Main dashboard with artists, tracks, albums, genres, friends
│   │   └── profile/        # User profile, settings, data export, privacy controls
│   └── api/                # API routes
│       ├── snapshot/       # Snapshot collection endpoint
│       ├── rankings/       # Ranking history queries
│       ├── friends/        # Friend system (follow, unfollow, search, sync)
│       ├── artists/        # Artist-specific data
│       └── user/           # User settings (privacy, profile)
├── components/
│   ├── ui/                 # shadcn/ui components (50+ components)
│   ├── charts/             # Recharts components (sparklines, ranking charts)
│   ├── app-sidebar.tsx     # Dashboard navigation with theme toggle
│   ├── *-list.tsx          # List components for artists, tracks, albums
│   ├── query-provider.tsx  # React Query configuration
│   └── auto-snapshot-trigger.tsx  # Auto-snapshot on dashboard load
├── lib/
│   ├── supabase/           # Supabase client utilities + generated types
│   ├── spotify/            # Spotify API layer & types
│   └── constants.ts        # App-wide constants
├── hooks/
│   ├── use-debounce.ts     # Debounce hook for search
│   └── use-mobile.ts       # Mobile detection hook
├── supabase/
│   └── functions/          # Edge Functions (cron snapshots)
└── proxy.ts                # Auth protection for /dashboard/* (Next.js 16)
```

## Database Schema

### Automated Schema Synchronization

The database schema is automatically synchronized from Supabase to this repository:

- **Schema file**: `supabase/schema/schema.sql` (complete database structure)
- **TypeScript types**: `lib/supabase/database.ts` (auto-generated)
- **Sync frequency**: Daily at 2 AM UTC via GitHub Actions
- **Documentation**: See [SCHEMA_SYNC.md](SCHEMA_SYNC.md) for details

This ensures the repository always reflects the authoritative database schema, with all changes tracked in Git.

### Core Tables
- **snapshots** — Tracks when data was collected (auto-collected on dashboard visits)
- **artist_rankings** — User's top artist rankings per snapshot
- **track_rankings** — User's top track rankings per snapshot  
- **album_rankings** — Albums derived from top tracks
- **artist_listening_stats** — Aggregated listening statistics per artist

### Social Features
- **user_profiles** — Public user profiles with Discord-style usernames and privacy settings
- **follow_cache** — Cached Spotify follow verification results (reduces API calls)

All tables have Row Level Security (RLS) enabled to ensure users can only access their own data and public data from friends.

## Automated Snapshots

Snapshots are automatically collected when users visit the dashboard (see [auto-snapshot-trigger.tsx](components/auto-snapshot-trigger.tsx)). The system respects a 24-hour interval to avoid excessive API calls. You can also set up:

- **Scheduled snapshots** via Supabase Edge Functions with pg_cron
- **External cron services** calling `/api/snapshot` with authentication

## Key Features Explained

### Friend System
The friends feature lets users:
- See their Spotify followers who also use the app
- Follow back suggestions for mutual connections
- Search for other users by display name
- View stats from friends (respects privacy settings)
- Cache follow relationships to reduce Spotify API calls

### Privacy Controls
Users can set their stats visibility to:
- **Public** — Anyone can view your stats
- **Friends Only** — Only mutual Spotify followers can see your stats
- **Private** — Only you can see your stats

### Auto-Generated Database Types
The project uses Supabase CLI to generate TypeScript types directly from the database schema. This ensures type safety and eliminates manual type definitions:

```bash
supabase gen types typescript --project-id <id> > lib/supabase/database.ts
```

All database queries use these generated types for maximum type safety.

## Scripts

```bash
bun dev          # Start development server
bun build        # Build for production
bun start        # Start production server
bun lint         # Run ESLint
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

### Environment Variables for Vercel
Make sure to add these in your Vercel project settings:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Post-Deployment
- Vercel Analytics and Speed Insights are automatically enabled
- Update your Spotify app redirect URIs to include your Vercel domain
- Update Supabase Auth settings to allow your Vercel domain

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Performance Optimizations

This app includes several performance optimizations:
- **Parallel data fetching** — Multiple time ranges fetched simultaneously
- **React Query caching** — Social features use TanStack Query for efficient state management
- **Server Components** — Most pages are server-rendered for faster initial loads
- **Image optimization** — Next.js Image component with Spotify CDN integration
- **Request deduplication** — Follow status cached to reduce Spotify API calls
- **Code splitting** — Client components lazy-loaded only when needed

## License

MIT
