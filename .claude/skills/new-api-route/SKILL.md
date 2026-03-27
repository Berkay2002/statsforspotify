---
name: new-api-route
description: Scaffold a new API route following the existing patterns in app/api/
---

Create a new API route under `app/api/`. Use `$ARGUMENTS` as the route name/path.

Follow these project conventions:
- Use the Supabase server client from `@/lib/supabase/`
- Use types from `@/lib/supabase/database.ts` (auto-generated, don't modify)
- Follow error handling patterns from existing routes in `app/api/`
- Return proper HTTP status codes and JSON responses
- Validate auth via Supabase session where appropriate
