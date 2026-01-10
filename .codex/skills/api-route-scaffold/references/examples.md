## Friend routes (authenticated + DB)

- `app/api/friends/follow/route.ts`: action-style POST, returns `{ success, status, message }`
- `app/api/friends/search/route.ts`: GET with `?q=`, returns `{ results }`

## Artist routes (mix of Spotify + DB)

- `app/api/artists/[id]/route.ts`: fetches details from Spotify
- `app/api/artists/[id]/stats/route.ts`: authenticated DB stats lookup

Use these as “closest sibling” references when deciding conventions for a new route.

