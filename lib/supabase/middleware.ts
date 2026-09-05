import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          const previousCookies = supabaseResponse.cookies.getAll();
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          previousCookies.forEach(cookie => supabaseResponse.cookies.set(cookie));
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError?.status === 401 || authError?.status === 403) {
    await supabase.auth.signOut({ scope: "local" });
  }

  if (user) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.provider_token || session?.provider_refresh_token) {
      // Remove provider credentials left in cookies by older application
      // versions. Supabase session refresh does not refresh Spotify tokens.
      await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    }
  }
  supabaseResponse.headers.set("Cache-Control", "private, no-store");

  return { user, supabaseResponse };
}
