## Query params (`GET`)

Use:
- `const { searchParams } = new URL(request.url);`
- Validate with explicit messages and sensible defaults.

Common patterns:
- search query `q`: require min length; in search endpoints, returning empty results is often better UX than 400
- `limit`: parse integer, clamp to safe range
- `timeRange`: validate against `"short_term" | "medium_term" | "long_term"` (see `validateTimeRange()` in `lib/api/utils.ts`)

## JSON body (`POST`)

Use:
- `const requestBody = await request.json();`
- Validate required fields with `badRequestResponse("... is required")`.

Keep validation dependency-free by default.

