# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

- **Install**: `bun install`
- **Dev server**: `bun run dev`
- **Build**: `bun run build`
- **Lint**: `bun run lint`
- **Validate schema sync**: `bun run validate:schema-sync`

## Tech Stack

- **Framework**: Next.js 16 with React 19 (App Router, server components by default)
- **Database**: Supabase (PostgreSQL + Auth + Edge Functions + RLS on all tables)
- **Auth**: Spotify OAuth 2.0 via Supabase, middleware in `proxy.ts`
- **Styling**: Tailwind CSS v4, shadcn/ui (radix-maia style, stone base color), Lucide icons
- **State**: TanStack React Query v5 for async state, React context/hooks for local state
- **Charts**: Recharts v3
- **Runtime**: Bun (preferred) or Node.js 18+
- **Deployment**: Vercel

## Architecture

- `app/(public)/` — landing, login, auth callback (no auth required)
- `app/(protected)/` — dashboard, profile, social features (auth required)
- `app/api/` — API routes (artists, friends, rankings, snapshot, spotify, user)
- `components/ui/` — shadcn/ui primitives (50+ components)
- `lib/spotify/` — Spotify API layer and types
- `lib/supabase/` — Supabase clients and auto-generated types
- Path alias: `@/*` maps to project root

## Supabase

- Schema definition: `supabase/schema/schema.sql`
- Auto-generated TypeScript types: `lib/supabase/database.ts`
- Types and schema are auto-synced daily via GitHub Actions (`.github/workflows/sync-supabase-schema.yml`)
- Edge Functions in `supabase/functions/` (e.g., `collect-snapshots`)
- Do not manually edit `lib/supabase/database.ts` — it is generated from the schema

## Images

- Remote image patterns configured for `i.scdn.co` (Spotify CDN) only in `next.config.ts`
