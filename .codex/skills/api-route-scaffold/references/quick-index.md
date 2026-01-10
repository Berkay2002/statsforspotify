This skill scaffolds an API route under `app/api/**/route.ts` using existing Supabase auth + error handling utilities.

## Repo anchors

- API utilities: `lib/api/utils.ts`
  - `getAuthenticatedUser()`, `validateAuth()`, `withAuthHandler()`
  - `badRequestResponse()`, `notFoundResponse()`, `serverErrorResponse()`, `handleAPIError()`
- Example authenticated action route: `app/api/friends/follow/route.ts`
- Example authenticated `GET` with query params: `app/api/friends/search/route.ts`
- Example authenticated param route: `app/api/artists/[id]/stats/route.ts`
- Example Spotify data route: `app/api/artists/[id]/route.ts`

## Templates in this skill

Open the relevant template from:
- `assets/templates/` (full route skeletons)
- `assets/snippets/` (input parsing + validation helpers)

