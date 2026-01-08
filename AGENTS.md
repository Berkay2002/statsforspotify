# AGENTS.md

Instructions for AI agents working on this codebase.

## How to Use This Guide

This document is optimized for GitHub Copilot and other AI coding agents. It provides:
- **Context**: What this project does and how it's structured
- **Conventions**: Coding standards and patterns to follow
- **Workflows**: Step-by-step guides for common tasks
- **Guardrails**: Security, performance, and testing requirements

**Before making changes**: Read relevant sections, understand existing patterns, and follow the established conventions.

## Project Overview

This is a Next.js 16 app using the App Router, Supabase for auth/database, and Recharts for visualizations. It tracks Spotify listening stats over time.

## Dev Environment

- Use `bun` as the package manager (not npm/pnpm)
- Run `bun install` to install dependencies
- Run `bun dev` to start the dev server on port 3000
- The app uses Turbopack by default in Next.js 16

## Project Structure

- `app/(public)/` — Public routes (landing, login, auth callback)
- `app/(protected)/` — Auth-required routes (dashboard, profile)
- `app/api/` — API routes
- `lib/supabase/` — Supabase client utilities (client.ts, server.ts, middleware.ts)
- `lib/spotify/` — Spotify API functions and types
- `components/ui/` — shadcn/ui components
- `supabase/migrations/` — SQL files to run in Supabase SQL Editor
- `supabase/functions/` — Deno Edge Functions (excluded from TypeScript build)

## Key Files

- `proxy.ts` — Protects `/dashboard/*` routes, refreshes Supabase sessions (renamed from middleware.ts in Next.js 16)
- `lib/spotify/api.ts` — `getTopArtists()`, `getTopTracks()`, `getTopAlbums()`
- `lib/spotify/types.ts` — TypeScript interfaces for Spotify data
- `components/app-sidebar.tsx` — Dashboard sidebar with navigation and theme toggle

## Testing Instructions

- Run `bun run build` to check for TypeScript and build errors
- Run `bun lint` to check ESLint rules
- No test suite is currently configured; add Vitest if needed

## Code Style

- Use TypeScript for all new files
- Follow existing patterns for Server Components vs Client Components
- Prefix client components with `"use client"` directive
- Use `@/` path alias for imports
- Supabase server client: `await createClient()` from `@/lib/supabase/server`
- Supabase browser client: `createClient()` from `@/lib/supabase/client`

### Naming Conventions
- Components: PascalCase (e.g., `ArtistsList.tsx`)
- Files: kebab-case for multi-word files (e.g., `artist-rankings.tsx`)
- API routes: RESTful naming (e.g., `/api/artists/[id]/route.ts`)
- Database tables: snake_case (e.g., `artist_rankings`)
- TypeScript types: PascalCase with descriptive names (e.g., `RankedArtist`)

### Component Patterns
- Use Server Components by default
- Only add `"use client"` when you need:
  - Hooks (useState, useEffect, etc.)
  - Event handlers (onClick, onChange, etc.)  
  - Browser APIs (localStorage, window, etc.)
  - Context providers
- Keep client components small and focused
- Pass data from Server Components to Client Components via props

## Database Changes

- Add new migrations as numbered SQL files in `supabase/migrations/`
- Always enable RLS on new tables
- Run migrations manually via Supabase SQL Editor

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Spotify OAuth is configured in Supabase Dashboard, not in env vars.

## Common Tasks

### Adding a new dashboard page
1. Create file in `app/(protected)/dashboard/<page>/page.tsx`
2. Use Server Component by default (no `"use client"`)
3. Fetch data using Supabase server client or Spotify API functions
4. Add navigation link in `components/app-sidebar.tsx` (update `navItems` array)
5. Test with authentication (sign in via Spotify)

### Adding a new API route
1. Create file in `app/api/<route>/route.ts`
2. Export HTTP method functions: `GET`, `POST`, `PUT`, `DELETE`
3. Use `createClient()` from `@/lib/supabase/server` for auth
4. Wrap in try/catch and return NextResponse.json()
5. Verify user authentication before processing: `await supabase.auth.getUser()`

### Fetching Spotify data
1. Import functions from `@/lib/spotify/api`
2. Available functions:
   - `getTopArtists(timeRange, limit)` - User's top artists
   - `getTopTracks(timeRange, limit)` - User's top tracks
   - `getTopAlbums(timeRange, limit)` - Derived from top tracks
   - `getTopGenres(timeRange, limit)` - Derived from top artists
   - `getCurrentUser()` - Spotify user profile
3. Functions auto-handle token refresh via Supabase session
4. Catch `SpotifyAPIError` for proper error handling

### Adding a shadcn/ui component
1. Check if component exists: `ls components/ui/`
2. If not, add it: `npx shadcn@latest add <component-name>`
3. Import from `@/components/ui/<component-name>`
4. Follow existing styling patterns (Tailwind classes)

### Creating a database migration
1. Create numbered SQL file in `supabase/migrations/` (e.g., `007_add_new_table.sql`)
2. Always include RLS policies for new tables
3. Add indexes for frequently queried columns
4. Test SQL in Supabase SQL Editor before committing
5. Run migration manually via Supabase Dashboard > SQL Editor

### Modifying Spotify data types
1. Update TypeScript interfaces in `lib/spotify/types.ts`
2. Update API functions in `lib/spotify/api.ts` if needed
3. Update database schema if storing the new fields
4. Run `npm run build` to check for type errors

## Error Handling

### API Routes
- Always wrap route handlers in try/catch blocks
- Return consistent JSON responses with appropriate status codes
- Log errors to console for debugging: `console.error("Context:", error)`
- Use NextResponse.json() for all API responses

Example pattern:
```typescript
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // ... your logic here
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error context:", error);
    return NextResponse.json({ error: "Error message" }, { status: 500 });
  }
}
```

### Spotify API Errors
- Spotify API functions throw `SpotifyAPIError` with status codes
- Token expiration (401) automatically triggers refresh via `getAccessToken()`
- Always handle potential token expiration in UI components

## Security Best Practices

### Authentication & Authorization
- All protected routes are guarded by `proxy.ts` middleware
- API routes must verify user authentication: `await supabase.auth.getUser()`
- Never expose Spotify access tokens to client-side code

### Database Security
- All tables use Row Level Security (RLS) policies
- RLS policies ensure users can only access their own data
- Always use parameterized queries via Supabase client (never raw SQL from user input)

### Data Sanitization
- CSV exports use `escapeCSV()` function to prevent injection
- User-provided data is validated before database insertion
- Spotify data is trusted but images are served via Next.js Image with allowlist

### Environment Variables
- Never commit `.env.local` to git
- All public env vars must be prefixed with `NEXT_PUBLIC_`
- Spotify credentials are stored in Supabase Dashboard, not in env files

## Performance Considerations

### Image Optimization
- Always use Next.js `<Image>` component for Spotify images
- Prefer medium-sized images (index 1) from Spotify API responses
- Images are cached for 30 days (see `next.config.ts`)
- Remote patterns are allowlisted for `i.scdn.co` domain only

### Data Fetching
- Use React Server Components for data fetching when possible
- API routes return minimal data structures
- Batch Spotify API calls using `Promise.all()` when fetching multiple resources
- Implement rate limiting for snapshot collection (24-hour interval)

### Database Queries
- Always add pagination for large result sets
- Use indexes on frequently queried columns (already configured)
- Prefer database functions for complex operations (e.g., `update_artist_listening_stats`)

## Dependency Management

### Adding New Dependencies
1. Check if the functionality exists in current dependencies first
2. Prefer packages with active maintenance and good TypeScript support
3. Install with npm (bun not available in all environments): `npm install <package>`
4. Update `package.json` manually if needed
5. Check for security vulnerabilities: `npm audit`
6. Test the build after adding: `npm run build`

### Package Manager Notes
- Project uses `bun` in development (faster installs)
- Falls back to `npm` when bun is unavailable
- Both `bun.lock` and `package-lock.json` are committed

## Debugging & Troubleshooting

### Common Issues

**"No active session" errors**
- User needs to sign in again via Spotify OAuth
- Check if `provider_token` exists in Supabase session
- Verify Spotify OAuth is configured in Supabase Dashboard

**Build errors with Supabase functions**
- Supabase Edge Functions are excluded from TypeScript build (see `tsconfig.json`)
- Edge Functions use Deno runtime, not Node.js
- Don't import Edge Function code from Next.js app

**Middleware not protecting routes**
- Ensure file is named `proxy.ts` in Next.js 16 (not `middleware.ts`)
- Check that `config.matcher` includes the route pattern
- Verify `updateSession()` is being called

**Spotify API rate limiting**
- Implement client-side caching for frequently accessed data
- Use snapshot system for historical data instead of live API calls
- Respect Spotify's rate limits (currently not enforced in code)

### Development Tools
- Check browser console for client-side errors
- Check terminal/server logs for API route errors
- Use React DevTools to inspect component state
- Use Supabase Dashboard to verify database queries and RLS policies

## PR Instructions

- Run `npm run build` (or `bun run build`) before committing
- Run `npm run lint` (or `bun lint`) to check ESLint rules
- Ensure no TypeScript errors
- Test auth flows manually if changing auth-related code
- Verify RLS policies still work if modifying database queries
- Test with network throttling if changing image/data fetching
