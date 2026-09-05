import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database";

// Only use after validating the current user. This client bypasses RLS.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server Supabase credentials are not configured");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
