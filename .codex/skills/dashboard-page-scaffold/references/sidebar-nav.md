Sidebar navigation lives in `components/app-sidebar.tsx` as `navRoutes`.

## Adding a new nav route

- Keep `id` stable and URL-aligned (prefer the page slug).
- Use a lucide icon.
  - If the icon is not imported, add it to the lucide import list in `components/app-sidebar.tsx`.
- Use `href: "/dashboard/<slug>"`.

## Defaults

- Default: add new pages to the sidebar unless the user says otherwise.

