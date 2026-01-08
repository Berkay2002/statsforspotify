# GitHub Copilot Instructions

This repository uses AI-friendly documentation to help Copilot and other AI agents work effectively.

## Quick Reference

📖 **Full documentation**: See [`AGENTS.md`](../AGENTS.md) in the root directory for comprehensive guidelines.

## Key Points for Copilot

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL + Auth)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Package Manager**: bun (fallback to npm)

### Critical Rules
1. **Always use TypeScript** - No plain JavaScript files
2. **Use generated database types** - Import from `lib/supabase/database.ts`, never create manual DB interfaces
3. **Server Components by default** - Only add `"use client"` when necessary
4. **Security first** - All API routes must verify authentication
5. **RLS enabled** - All database tables use Row Level Security
6. **Error handling** - Wrap all API routes in try/catch blocks
7. **NO code duplication** - Check `lib/api/utils.ts` and `lib/spotify/helpers.ts` before writing similar code
8. **Descriptive names only** - No abbreviations: use `user` not `usr`, `response` not `res`, `error` not `err`
9. **Optimize performance** - Use `React.memo()`, `useCallback()`, and `useMemo()` for expensive operations

### Before Making Changes
- Read the relevant sections in `AGENTS.md`
- Understand existing patterns in similar files
- Run `npm run build` and `npm run lint` to verify changes
- Test authentication flows if touching auth code

### Database Types - ALWAYS USE GENERATED TYPES
```typescript
// Import generated database types (DO NOT manually create interfaces)
import type { Database } from '@/lib/supabase/database';

// Use database types for all Supabase queries
type ArtistRanking = Database['public']['Tables']['artist_rankings']['Row'];
type TrackRanking = Database['public']['Tables']['track_rankings']['Row'];

// Regenerate types after schema changes:
// supabase gen types typescript --project-id <id> > lib/supabase/database.ts
```

### Common Patterns
```typescript
// API Route Pattern - Use shared utilities!
import { authenticateUser, requireUser } from '@/lib/api/utils';

export async function POST(request: Request) {
  try {
    const user = await requireUser(); // Use helper instead of manual auth
    // ... your logic
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error message" }, { status: 500 });
  }
}

// Data Fetching - Use helpers from lib/spotify/helpers.ts
import { fetchArtistsByTimeRange, fetchTracksByTimeRange } from "@/lib/spotify/helpers";
const artists = await fetchArtistsByTimeRange("medium_term");
const tracks = await fetchTracksByTimeRange("short_term");

// List Components - Use TimeRangeList wrapper
import TimeRangeList from '@/components/time-range-list';
// Wrap your list component with TimeRangeList instead of duplicating time range logic
```

### File Locations
- Protected pages: `app/(protected)/dashboard/*/page.tsx`
- Public pages: `app/(public)/*/page.tsx`
- API routes: `app/api/*/route.ts`
- Components: `components/*.tsx`
- UI components: `components/ui/*.tsx`
- Spotify logic: `lib/spotify/*.ts`
- Supabase clients: `lib/supabase/*.ts`
- **Database types**: `lib/supabase/database.ts` (auto-generated, use this!)

### Testing
```bash
npm run build   # Check TypeScript and build
npm run lint    # Check ESLint rules
npm run dev     # Start development server
```

---

For detailed information on error handling, security, performance, debugging, and more, see [`AGENTS.md`](../AGENTS.md).
