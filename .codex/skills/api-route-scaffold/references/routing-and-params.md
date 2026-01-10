## Folder naming

`app/api/<segments>/route.ts` maps to `/api/<segments>`.

Examples:
- `app/api/friends/follow/route.ts` → `/api/friends/follow`
- `app/api/artists/[id]/stats/route.ts` → `/api/artists/:id/stats`

## Dynamic params

In this repo, param routes often use:

- `export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> })`
- Then `const { id } = await params;`

Mirror the existing style in sibling routes unless there’s a reason to deviate.

