# Stats for Spotify

A web app to track your Spotify listening history and visualize how your music taste evolves over time.

## Features

- **Top Artists, Tracks & Albums** — View your top 50 items across different time ranges (4 weeks, 6 months, all time)
- **Historical Tracking** — Save snapshots of your rankings to track changes over time
- **Trend Visualization** — Recharts-powered line graphs showing ranking history
- **Dark Mode** — Dark theme by default with toggle support
- **Data Portability** — Export your data as JSON or CSV
- **Privacy Controls** — Delete all your data at any time (Spotify compliance)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Auth**: Spotify OAuth via Supabase

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
2. Run the SQL migrations in order from `supabase/migrations/`
3. Go to **Authentication > Providers > Spotify** and configure:
   - Client ID and Secret from your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Callback URL: `https://<your-project>.supabase.co/auth/v1/callback`

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
│   ├── (public)/           # Landing, login, auth callback
│   ├── (protected)/        # Dashboard, profile (auth required)
│   └── api/                # API routes (snapshot, export, delete)
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── charts/             # Recharts components
│   └── app-sidebar.tsx     # Dashboard navigation
├── lib/
│   ├── supabase/           # Supabase client utilities
│   └── spotify/            # Spotify API layer & types
├── supabase/
│   ├── migrations/         # SQL migration files
│   └── functions/          # Edge Functions (cron snapshots)
└── middleware.ts           # Auth protection for /dashboard/*
```

## Database Schema

- **snapshots** — Tracks when data was collected
- **artist_rankings** — User's top artist rankings per snapshot
- **track_rankings** — User's top track rankings per snapshot  
- **album_rankings** — Albums derived from top tracks

All tables have Row Level Security (RLS) enabled.

## Automated Snapshots

Daily snapshots can be collected automatically via pg_cron (see `supabase/migrations/006_setup_cron.sql`) or external cron services calling `/api/snapshot`.

## Scripts

```bash
bun dev          # Start development server
bun build        # Build for production
bun start        # Start production server
bun lint         # Run ESLint
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## License

MIT
