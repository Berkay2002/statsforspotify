## Recommended success envelopes

Pick one and stay consistent within a feature group:

- Read endpoints: `{ data: ... }`
- List endpoints: `{ results: ... }` (matches `friends/search`)
- Action endpoints: `{ success: true, ... }` (matches `friends/follow`)

## Recommended “action status”

When the UI can branch, return a stable status enum, e.g.:
- `{ success: true, status: "pending" | "accepted" | "none" }`

