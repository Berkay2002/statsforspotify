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
    const redirectTo = `${origin}/auth/callback`;
    console.log("OAuth redirectTo:", redirectTo);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "spotify",
      options: {
        redirectTo,
        scopes: "user-read-email user-top-read user-follow-read user-follow-modify",
      },
    });

    if (error) {
      console.error("OAuth init error:", error.message);
      return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error.message)}`);
    }

    if (data.url) {
      console.log("Redirecting to:", data.url);
      return NextResponse.redirect(data.url);
    }
    
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent("Failed to get OAuth URL")}`);
  }

  // Handle OAuth callback with code
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth exchange error:", error.message);
      return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error.message)}`);
    }

    // Sync display name and avatar from Spotify on login
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get Spotify identity data
        const { data: identities } = await supabase.auth.getUserIdentities();
        const spotifyIdentity = identities?.identities.find(i => i.provider === 'spotify');

        if (spotifyIdentity?.identity_data) {
          const displayName = spotifyIdentity.identity_data.name || spotifyIdentity.identity_data.full_name || 'User';
          const avatarUrl = spotifyIdentity.identity_data.picture?.url || null;

          // Update user profile with latest Spotify data (keeps discriminator unchanged)
          await supabase
            .from('user_profiles')
            .update({
              display_name: displayName,
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        }
      }
    } catch (syncError) {
      // Don't fail the login if sync fails
      console.error('Failed to sync profile from Spotify:', syncError);
    }

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

  // No code provided - check for error from OAuth provider
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(errorDescription || error)}`);
  }

  // Return to home with generic error
  return NextResponse.redirect(`${origin}/?error=${encodeURIComponent("Could not authenticate - no code received")}`);
}
