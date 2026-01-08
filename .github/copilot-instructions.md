# Copilot Instructions for Stats for Spotify

This document provides guidance for GitHub Copilot when working on the Stats for Spotify codebase.

## Project Overview

Stats for Spotify is a Next.js 16 application that tracks and visualizes users' Spotify listening history over time. The app uses:

- **Framework**: Next.js 16 with App Router
- **Database & Auth**: Supabase (PostgreSQL + OAuth)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Charts**: Recharts for data visualization
- **Runtime**: Node.js 18+ (Bun preferred for local development)

## Development Setup

### Package Manager

**Always use `bun` as the package manager** (not npm or pnpm). If bun is not available, npm can be used as a fallback.

```bash
# Install dependencies
bun install

# Start development server (runs on port 3000)
bun dev

# Build for production
bun run build

# Run linter
bun lint
```

### Environment Variables

Required environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Spotify OAuth credentials are configured in the Supabase Dashboard, not in environment variables.

## Project Structure

```
├── app/
│   ├── (public)/              # Public routes: landing, login, auth callback
│   ├── (protected)/           # Auth-required routes: dashboard, profile
│   └── api/                   # API routes
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── charts/                # Recharts components
│   └── *.tsx                  # App-specific components
├── lib/
│   ├── supabase/              # Supabase client utilities
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server client
│   │   └── middleware.ts      # Session refresh helper
│   └── spotify/               # Spotify API layer
│       ├── api.ts             # API functions
│       └── types.ts           # TypeScript interfaces
├── supabase/
│   ├── migrations/            # SQL migration files (run in Supabase SQL Editor)
│   └── functions/             # Deno Edge Functions (excluded from TypeScript build)
├── proxy.ts                   # Middleware for auth protection (Next.js 16)
└── tsconfig.json              # TypeScript configuration
```

## Key Files and Their Purposes

- **`proxy.ts`**: Protects `/dashboard/*` and `/profile/*` routes, refreshes Supabase sessions (renamed from `middleware.ts` in Next.js 16)
- **`lib/spotify/api.ts`**: Contains functions like `getTopArtists()`, `getTopTracks()`, `getTopAlbums()` with auto token refresh
- **`lib/spotify/types.ts`**: TypeScript interfaces for Spotify data structures
- **`components/app-sidebar.tsx`**: Dashboard sidebar with navigation and theme toggle

## Code Style and Conventions

### TypeScript

- **Always use TypeScript** for new files
- Use the `@/` path alias for imports (configured in `tsconfig.json`)
- Avoid using `any` type; prefer specific types or generics

### React Components

- **Server Components by default**: Components are Server Components unless they need client-side interactivity
- **Client Components**: Add `"use client"` directive at the top of files that need:
  - useState, useEffect, or other React hooks
  - Event handlers (onClick, onChange, etc.)
  - Browser APIs
  - Context providers
- Follow existing patterns for Server vs Client Components in the codebase

### Supabase Client Usage

- **Server-side** (Server Components, API routes, Server Actions):
  ```typescript
  import { createClient } from "@/lib/supabase/server";
  const supabase = await createClient();
  ```
- **Client-side** (Client Components):
  ```typescript
  import { createClient } from "@/lib/supabase/client";
  const supabase = createClient();
  ```

### Styling

- Use Tailwind CSS utility classes
- Follow shadcn/ui component patterns
- Dark mode is the default theme

## Database

### Migrations

- Add new migrations as numbered SQL files in `supabase/migrations/`
- Always enable Row Level Security (RLS) on new tables
- Run migrations manually via the Supabase SQL Editor

### Schema

Main tables:
- **snapshots**: Tracks when data was collected
- **artist_rankings**: User's top artist rankings per snapshot
- **track_rankings**: User's top track rankings per snapshot
- **album_rankings**: Albums derived from top tracks

All tables have RLS enabled and are scoped to user_id.

## Common Tasks

### Adding a New Dashboard Page

1. Create file: `app/(protected)/dashboard/<page>/page.tsx`
2. Add navigation link in `components/app-sidebar.tsx`
3. Ensure the page is a Server Component unless it needs client interactivity

### Adding a New API Route

1. Create file: `app/api/<route>/route.ts`
2. Use `createClient()` from `@/lib/supabase/server` for authentication
3. Check user authentication before processing requests:
   ```typescript
   const supabase = await createClient();
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }
   ```

### Fetching Spotify Data

1. Import from `@/lib/spotify/api`
2. Functions automatically handle token refresh via Supabase session
3. Example:
   ```typescript
   import { getTopArtists } from "@/lib/spotify/api";
   const artists = await getTopArtists(supabase, "short_term");
   ```

### Adding a shadcn/ui Component

Use the shadcn CLI (components should already be configured):
```bash
npx shadcn@latest add <component-name>
```

## Testing and Quality

### Before Committing

Always run these commands before committing:

```bash
bun run build  # Check for TypeScript and build errors
bun lint       # Check ESLint rules
```

### Current Test Setup

- No test suite is currently configured
- Consider adding Vitest if test coverage is needed

### Manual Testing

For changes affecting:
- **Authentication**: Test login/logout flows manually
- **UI**: Verify changes in development server
- **API routes**: Test endpoints with appropriate authentication

## Special Considerations

### Next.js 16 Changes

- Middleware file is named `proxy.ts` instead of `middleware.ts`
- Uses Turbopack by default in development
- React 19 is used (note any breaking changes)

### Supabase Edge Functions

- Located in `supabase/functions/`
- Run on Deno runtime (not Node.js)
- Excluded from TypeScript build via `tsconfig.json`
- Have separate dependency management

### Image Optimization

- Spotify images (album art, artist photos) are configured in `next.config.ts`
- Use Next.js `<Image>` component for optimal loading
- Images are cached for 30 days (Spotify images rarely change)

## Deployment

The app is designed to be deployed on Vercel:

1. Connect the GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy (automatic on push to main branch)

## Getting Help

- Check existing code patterns before implementing new features
- Refer to Next.js 16, Supabase, and Recharts documentation
- Follow the existing component structure and naming conventions

## Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Recharts Documentation](https://recharts.org)
