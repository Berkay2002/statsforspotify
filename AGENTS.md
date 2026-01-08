# AGENTS.md

Instructions for AI agents working on this codebase.

> **Note**: For GitHub Copilot users, see also `.github/copilot-instructions.md` for additional guidance.

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
- **Note**: There are existing lint warnings/errors in the codebase that are not your responsibility to fix unless they're related to your changes

## Code Style

- Use TypeScript for all new files
- Follow existing patterns for Server Components vs Client Components
- Prefix client components with `"use client"` directive
- Use `@/` path alias for imports
- Supabase server client: `await createClient()` from `@/lib/supabase/server`
- Supabase browser client: `createClient()` from `@/lib/supabase/client`

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
2. Add navigation link in `components/app-sidebar.tsx`

### Adding a new API route
1. Create file in `app/api/<route>/route.ts`
2. Use `createClient()` from `@/lib/supabase/server` for auth

### Fetching Spotify data
1. Import from `@/lib/spotify/api`
2. Functions auto-handle token refresh via Supabase session

## PR Instructions

- Run `bun run build` and `bun lint` before committing
- Ensure no TypeScript errors introduced by your changes
- Test auth flows manually if changing auth-related code
- Review the scope of your changes before pushing
- Only fix issues directly related to your task

## Dependencies

When adding new dependencies:
- Prefer using existing libraries already in the project
- Only add new packages if absolutely necessary
- Check for security vulnerabilities before adding
- Use `bun add <package>` to install (or `npm install` as fallback)
