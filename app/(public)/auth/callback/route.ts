import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const action = searchParams.get("action");

  // If this is a login action, redirect to Spotify OAuth
  if (action === "login") {
    const supabase = await createClient();
    
    // Build redirect URL - handle both localhost and production
    const forwardedHost = request.headers.get("x-forwarded-host");
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    
    let redirectTo: string;
    if (process.env.NODE_ENV === "development") {
      redirectTo = `${origin}/auth/callback`;
    } else if (forwardedHost) {
      redirectTo = `${protocol}://${forwardedHost}/auth/callback`;
    } else {
      redirectTo = `${origin}/auth/callback`;
    }
    
    console.log("OAuth redirectTo:", redirectTo);
    console.log("Request headers - Host:", request.headers.get("host"), "Forwarded:", forwardedHost);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "spotify",
      options: {
        redirectTo,
        scopes: "user-read-email user-top-read user-follow-read user-follow-modify streaming user-modify-playback-state user-read-playback-state",
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
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    // Debug: Log session structure to find refresh token
    console.log('[Auth Callback] Session structure:', JSON.stringify({
      hasSession: !!session,
      provider_token: session?.provider_token?.substring(0, 20) + '...',
      provider_refresh_token: session?.provider_refresh_token?.substring(0, 20) + '...',
      keys: session ? Object.keys(session) : []
    }, null, 2));

    if (error) {
      console.error("Auth exchange error:", error.message);
      return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error.message)}`);
    }

    // If no session, redirect to home with error
    if (!session) {
      return NextResponse.redirect(`${origin}/?error=${encodeURIComponent("Failed to create session")}`);
    }

    // Sync display name and avatar from Spotify on login
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && session) {
        // Get Spotify identity data
        const { data: identities } = await supabase.auth.getUserIdentities();
        const spotifyIdentity = identities?.identities.find(
          (identity) => identity.provider === "spotify",
        );

        if (spotifyIdentity?.identity_data) {
          // Extract username from OAuth token (the 'sub' claim)
          const spotifyUsername = spotifyIdentity.identity_data.sub;
          
          // Fetch the REAL Spotify user ID from the Spotify API
          // The identity_data.sub is the username, not the actual ID
          let actualSpotifyUserId: string | null = null;
          
          try {
            const spotifyResponse = await fetch('https://api.spotify.com/v1/me', {
              headers: {
                'Authorization': `Bearer ${session.provider_token}`
              }
            });
            
            if (spotifyResponse.ok) {
              const spotifyProfile = await spotifyResponse.json();
              actualSpotifyUserId = spotifyProfile.id; // This is the REAL Spotify user ID
              console.log('[Auth Callback] Full Spotify profile response:', JSON.stringify(spotifyProfile, null, 2));
              console.log('[Auth Callback] Fetched Spotify user ID:', actualSpotifyUserId, '(length:', actualSpotifyUserId?.length, ')');
              console.log('[Auth Callback] Spotify username from sub:', spotifyUsername);
              console.log('[Auth Callback] Are they the same?', actualSpotifyUserId === spotifyUsername);
            } else {
              console.error('[Auth Callback] Failed to fetch Spotify profile:', spotifyResponse.status, spotifyResponse.statusText);
            }
          } catch (caughtError) {
            console.error("[Auth Callback] Failed to fetch Spotify profile:", caughtError);
          }
          
          const displayName = spotifyIdentity.identity_data.name || spotifyIdentity.identity_data.full_name || 'User';
          const avatarUrl = spotifyIdentity.identity_data.picture?.url || null;

          // Update user profile with latest Spotify data (keeps discriminator unchanged)
          const updateData: Record<string, string | null> = {
            spotify_user_name: spotifyUsername,
            display_name: displayName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          };
          
          // Only update spotify_user_id if we successfully fetched it
          if (actualSpotifyUserId) {
            updateData.spotify_user_id = actualSpotifyUserId;
          }
          
          await supabase
            .from('user_profiles')
            .update(updateData)
            .eq('user_id', user.id);
          
          console.log('[Auth Callback] Updated user profile - username:', spotifyUsername, 'user_id:', actualSpotifyUserId || 'not fetched');

          // Store refresh token in spotify_connections table
          // This is critical for cron jobs to work when users are offline
          // NOTE: provider_refresh_token is in the session object, not identity_data
          const refreshToken = session.provider_refresh_token;
          if (refreshToken) {
            const { error: spotifyConnectionError } = await supabase
              .from('spotify_connections')
              .upsert(
                {
                  user_id: user.id,
                  refresh_token: refreshToken,
                  scope_version: 2, // Incremented to 2 for Web Playback SDK scopes (streaming, user-modify-playback-state, user-read-playback-state)
                  status: 'connected',
                  connected_at: new Date().toISOString(),
                },
                {
                  onConflict: 'user_id',
                },
              );

            if (spotifyConnectionError) {
              console.error(
                '[Auth Callback] Failed to store refresh token in spotify_connections for user:',
                user.id,
                'error:',
                spotifyConnectionError,
              );
            } else {
              console.log('[Auth Callback] Stored refresh token in spotify_connections for user:', user.id);
            }
          } else {
            console.error('[Auth Callback] No refresh token found in session. Session data:', JSON.stringify(session, null, 2));
          }
        }
      }
    } catch (syncError) {
      // Don't fail the login if sync fails
      console.error('Failed to sync profile from Spotify:', syncError);
    }

    // After successful profile sync, redirect to dashboard or next URL
    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";
    const next = searchParams.get("next") || "/dashboard";

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
