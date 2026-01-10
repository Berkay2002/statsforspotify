---
name: api-route-scaffold
description: Scaffold a new Next.js App Router API route (app/api/**/route.ts) using existing Supabase auth and standard JSON error handling utilities.
metadata:
  short-description: Add an API route using repo patterns
---

You are working in a Next.js App Router repo with Supabase auth and shared API utilities in `lib/api/utils.ts`. This skill scaffolds a new API route that matches existing patterns and avoids repeated auth/error boilerplate.

## Skill Resources (use via progressive disclosure)

When you need repo context, open only the relevant reference(s):

- `references/quick-index.md` (entry points to the main “source of truth” files)
- `references/auth-and-errors.md` (auth + error handling patterns)
- `references/routing-and-params.md` (path/param conventions)
- `references/input-validation.md` (query/body validation patterns)
- `references/response-conventions.md` (success envelope guidance)
- `references/supabase-types.md` (generated DB typing reminders)
- `references/examples.md` (closest sibling route examples)

When you are ready to write code, start from templates and adapt:

- `assets/templates/` (route skeletons)
- `assets/snippets/` (input parsing + validation snippets)

If the user wants validation and approves running commands:

- `scripts/validate.sh`

## Discovery Questions (ask first, keep it non-technical)

Assume the user may not know HTTP methods, REST naming, input shapes, or DB details. Your job is to ask a few general questions, infer a good default design, and then propose a concrete route spec for approval before writing code.

Ask these questions (in order), and stop as soon as you can propose a solid route spec:

1) What user-visible feature or outcome are you trying to achieve? (1 sentence)
2) Is this primarily: read data, create something, update something, or delete something?
3) Who is allowed to do this?
   - only signed-in user (default)
   - signed-in user + their friends
   - anyone (public)
4) Where does the data come from?
   - Spotify live API
   - Supabase database
   - both
5) What does the frontend need back, at minimum? (example is fine; “a list of X”, “a single X”, “just `{ ok: true }`”)
6) Are there any obvious constraints?
   - pagination needed?
   - rate limiting concerns?
   - privacy rules (e.g., “don’t leak if user exists”)?

If the user can answer more, optionally ask:
- What inputs does the frontend already have available (ids, username, time range, etc.)?
- Any existing UI route this supports (e.g., `/dashboard/friends`)?

## Decision Policy (you choose “optimal defaults” when the user is unsure)

When the user cannot provide specifics, infer an initial route design and present 1 recommended option (and at most 1 alternative) for approval.

### Choose method(s)

- Read/list/search → `GET`
- Create/start action (follow, request, generate, snapshot) → `POST`
- Update/accept/reject/toggle/rename → `POST` (action-style) or `PATCH`/`PUT` (resource-style). Default to `POST` if unsure.
- Delete/remove/unfollow → `POST` (action-style) or `DELETE` (resource-style). Default to `POST` to match existing patterns in this repo.

### Choose path under `app/api/`

Prefer predictable, repo-consistent naming:
- Feature group first: `friends/*`, `artists/*`, `tracks/*`, `albums/*`
- Action routes: `friends/follow`, `friends/unfollow`, `friends/accept`, `friends/reject`
- Resource routes: `artists/[id]`, `artists/[id]/stats`

### Choose auth default

- Default: authenticated (`getAuthenticatedUser()`).
- Public only if the user explicitly wants it and it does not leak private user data.
- “Friends-only” typically means: authenticated + a DB check against friendships/follow rules (confirm expected behavior before implementing).

### Choose inputs

Keep inputs minimal and easy to call from the client:
- Use query params for simple filtering in `GET` (e.g., `?q=`, `?timeRange=`, `?limit=`)
- Use JSON body for `POST` actions (e.g., `{ friendUserId }`)
- Use `[id]` params for entity identity in the path (e.g., `/artists/[id]`)

### Choose response shape

Default to one of:
- Read: `{ data: ... }`
- Action: `{ success: true, ... }`
- Empty success: `{ success: true }`

Also include stable fields the UI can branch on when relevant (e.g., `{ status: "pending" | "accepted" }` in friend flows).

## Implementation Workflow

### 0) Propose the route spec (must-do)

Before creating files, propose a concrete spec based on the answers:
- path (under `app/api/`)
- method(s)
- auth policy
- inputs (query/body/params)
- success response shape
- key error cases (400/401/404)

Ask the user to confirm or adjust. Only then implement.

### 0.1) Choose a template (recommended)

After the user confirms the route spec, pick the closest template from `assets/templates/` and adapt it instead of starting from scratch. Prefer minimal diffs from existing sibling routes.

### 1) Prefer existing utilities (avoid duplication)

Before writing a handler, open and reuse:
- `lib/api/utils.ts` for auth + response helpers:
  - `getAuthenticatedUser()`
  - `badRequestResponse()`, `notFoundResponse()`, `serverErrorResponse()`
  - `handleAPIError()` (Spotify-aware)
  - `withAuthHandler()` (optional wrapper)

Note: Some existing routes use `try/catch` + `getAuthenticatedUser()`; others may directly return helpers. Match the prevailing style in the nearest sibling routes unless the user requests otherwise.

### 2) Create the route file

Create `app/api/<route>/route.ts` and export the requested method functions.

Authenticated routes (default):
- Call `getAuthenticatedUser()`
- If missing, return `NextResponse.json({ error: "Unauthorized" }, { status: 401 })` (or `unauthorizedResponse()` if present)
- Validate inputs and return `badRequestResponse("...")` for missing/invalid fields

Error handling:
- Wrap the method body in `try/catch`
- In `catch`, use `handleAPIError(error)` when appropriate (especially if Spotify calls exist), otherwise `serverErrorResponse("...")`

### 3) Validate inputs without adding new deps

Do not add new validation libraries by default. Use:
- `new URL(request.url).searchParams` for query params
- `await request.json()` for JSON bodies
- Simple type/shape checks with clear 400 messages

### 4) Supabase queries

- Use the Supabase client returned from `getAuthenticatedUser()`
- Use generated DB types if you need static typing (import `Database` from `@/lib/supabase/database`)
- Avoid selecting more columns than necessary

### 5) Validation (only if the user approves running commands)

Run:
- `bun lint`
- `bun run build`

## Guardrails (follow strictly)

- Do not reimplement auth checks; reuse `lib/api/utils.ts`.
- Do not manually edit generated Supabase schema/type files.
- Keep responses consistent JSON via `NextResponse.json`.
- Use descriptive names; avoid abbreviations like `res`, `err`, `idx`.
