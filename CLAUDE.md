# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

```bash
# Development
bun dev          # Start development server (uses Turbopack)
bun run build    # Build for production (verify before committing)
bun lint         # Run ESLint
bun start        # Start production server

# Database
bun validate:schema-sync  # Validate database schema synchronization
```

## High-Level Architecture

**Stats for Spotify** is a Next.js 16 app that tracks Spotify listening history with social features. Key architectural decisions:

### Authentication Flow
- Spotify OAuth via Supabase Auth
- Session management in `proxy.ts` (renamed from middleware.ts for Next.js 16)
- Protected routes in `app/(protected)/` require authentication

### Data Architecture
- **Snapshots**: Automatic collection when users visit dashboard (24h interval)
- **Rankings**: Artist/track/album rankings stored per snapshot
- **Social Layer**: Friend system based on Spotify mutual follows with privacy controls
- **Database Types**: Auto-generated from Supabase schema (`lib/supabase/database.ts`)

### Component Strategy
- Server Components by default for performance
- Client Components only when interactive features needed
- Shared list components wrapped with `TimeRangeList` for consistent time range handling

### API Design
- RESTful routes in `app/api/`
- Authentication required for all protected endpoints
- Shared utilities in `lib/api/utils.ts` for auth and error handling
- Spotify data fetching helpers in `lib/spotify/helpers.ts`

### Critical Patterns
1. **No Code Duplication**: Check existing utilities before writing similar logic
2. **Type Safety**: Always use generated database types, never manual interfaces
3. **Security**: All tables have RLS enabled, verify auth in API routes
4. **Performance**: Parallel data fetching, React Query for social features

## TypeScript LSP Feature

This project has the TypeScript LSP (Language Server Protocol) feature enabled in Claude Code settings. Use it for:

- **Type checking**: When editing TypeScript files, the LSP provides instant type feedback
- **Import suggestions**: Auto-complete imports from `@/` paths and local files
- **Refactoring**: Safe renaming and refactoring across the codebase
- **Error detection**: Catch type errors before running build/lint

The LSP is especially valuable when:
- Working with generated database types (`lib/supabase/database.ts`)
- Refactoring shared utilities in `lib/api/utils.ts` or `lib/spotify/helpers.ts`
- Ensuring proper typing in API routes and React components
- Catching type mismatches with Supabase queries

## Available Claude Code Plugins

This repository has the following plugins enabled to assist development:

### Supabase Plugin
The Supabase plugin provides direct database management capabilities:
- **Database operations**: Query tables, run migrations, execute SQL
- **Branch management**: Create development branches for schema changes
- **Edge Functions**: Deploy and manage Supabase Edge Functions
- **Common commands**:
  - `list_tables` - See all database tables
  - `apply_migration` - Run database migrations
  - `get_advisors` - Check for security/performance issues
  - `generate_typescript_types` - Regenerate types after schema changes

**When to use**: Direct database changes, schema migrations, checking table structures, or debugging data issues.

### Feature Dev Plugin
The feature-dev plugin provides specialized agents for complex development tasks:
- **Code Explorer**: Analyze existing features and architecture
- **Code Architect**: Design new feature implementations
- **Code Reviewer**: Automated code review for bugs and best practices

**When to use**: For complex features that need architectural planning or when you want automated code review before commits.

### Frontend Design Plugin
The frontend-design plugin helps build polished UI components:
- Create production-ready components with good design quality
- Integrates with the existing shadcn/ui component system

**When to use**: When building new UI components or pages that need high design quality.

### Code Review Plugin
Provides automated code review capabilities:
- Reviews for bugs, security issues, and code quality
- Confidence-based filtering to reduce noise

**When to use**: Before committing changes or opening pull requests.

### Commit Commands Plugin
Simplifies git operations with slash commands:
- `/commit` - Create commits with proper formatting
- `/commit-push-pr` - Commit, push, and open a PR in one command
- `/clean_gone` - Clean up local branches that were deleted on remote

**When to use**: For streamlined git workflows.

### Security Guidance Plugin
Provides security analysis and vulnerability detection.

**When to use**: Automatically active for security-related code changes.

## Common Development Workflows

### Adding a New Feature
1. Use **Feature Dev: Code Explorer** to understand existing patterns
2. Use **Feature Dev: Code Architect** to design the implementation
3. Build components (use **Frontend Design** for UI-heavy features)
4. Use **TypeScript LSP** while coding for type safety
5. Run `bun build` and `bun lint` to verify
6. Use **Code Review** plugin for automated review
7. Commit with `/commit` command

### Database Changes
1. Use **Supabase plugin** to:
   - Create a development branch first (for non-trivial changes)
   - Apply migrations with `apply_migration`
   - Verify changes with `list_tables` or `execute_sql`
2. Regenerate types: `generate_typescript_types`
3. Verify build: `bun build`
4. Commit schema changes and generated types together

### Debugging Issues
1. For data issues: Use **Supabase plugin** to query tables directly
2. For type errors: Rely on **TypeScript LSP** inline feedback
3. For API issues: Check `bun dev` logs and use Supabase plugin to verify data
4. For performance: Use Supabase `get_advisors` to check for missing indexes

## Key Integration Points

### Spotify API
- Client credentials in Supabase Edge Functions
- User tokens managed by Supabase Auth
- Rate limiting with 24h snapshot intervals

### Supabase Features
- Row Level Security on all tables
- Edge Functions for cron jobs
- Real-time subscriptions ready (not currently used)
- Schema synchronization via GitHub Actions

### Frontend State
- Server state for rankings and snapshots
- React Query for social features (friends, profiles)
- URL state for time ranges and navigation