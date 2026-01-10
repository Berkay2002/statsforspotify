If you need strongly typed rows:

- Import `Database` from `@/lib/supabase/database`
- Use `Database["public"]["Tables"]["<table>"]["Row" | "Insert" | "Update"]`

Do not edit generated files (`lib/supabase/database.ts`, `supabase/schema/schema.sql`) manually.

