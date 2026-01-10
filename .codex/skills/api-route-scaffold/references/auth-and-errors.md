## Auth patterns in this repo

Preferred default for routes that touch Supabase DB:

- Use `getAuthenticatedUser()` from `lib/api/utils.ts`
  - returns `{ user, supabase }` or `null`
  - avoids duplicating `createClient()` + `supabase.auth.getUser()` across routes

Alternative pattern used by some routes:

- Use `validateAuth()` + `createClient()`
  - Example: `app/api/artists/[id]/stats/route.ts`

## Error handling patterns

- Wrap handlers in `try/catch`.
- For generic failures, return `serverErrorResponse("...")`.
- If you call Spotify API helpers, prefer `handleAPIError(error)` which is Spotify-aware and can return reauth hints.

## Response consistency

Use `NextResponse.json(...)` consistently and keep error responses stable:
- 400: `{ error: "..." }`
- 401: `{ error: "Unauthorized" }`
- 404: `{ error: "..." }`
- 500: `{ error: "..." }`

