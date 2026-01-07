import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const action = searchParams.get("action");
  const next = searchParams.get("next") ?? "/dashboard";

  // If this is a login action, redirect to Spotify OAuth
  if (action === "login") {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "spotify",
      options: {
        redirectTo: `${origin}/auth/callback`,
        scopes: "user-read-email user-top-read",
      },
    });

    if (error) {
      return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error.message)}`);
    }

    if (data.url) {
      return NextResponse.redirect(data.url);
    }
  }

  // Handle OAuth callback with code
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return to home with error
  return NextResponse.redirect(`${origin}/?error=${encodeURIComponent("Could not authenticate")}`);
}
