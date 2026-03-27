---
name: new-page
description: Scaffold a new protected page following the App Router and shadcn/ui patterns in this project
---

Create a new page under `app/(protected)/`. Use `$ARGUMENTS` as the page name/path.

Follow these project conventions:
- Server component by default (no "use client" unless needed)
- Use `@/` path alias for imports
- Use shadcn/ui components from `@/components/ui/`
- Follow the layout patterns in existing protected pages
- Add any needed API routes in `app/api/` if the page requires data fetching
- Use TanStack React Query for client-side data fetching when needed
