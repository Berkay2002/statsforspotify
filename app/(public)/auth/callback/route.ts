import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applicationOrigin, safeNextPath } from "@/lib/auth/redirects";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Forwarded host headers are not a trusted redirect allowlist.
  const origin = applicationOrigin(request.url, process.env.NEXT_PUBLIC_APP_URL);
  const failure = (message: string) => NextResponse.redirect(
    `${origin}/?error=${encodeURIComponent(message)}`,
  );
  const supabase = await createClient();

  if (searchParams.get("action") === "login") {
    const redirectTo = new URL("/auth/callback", origin);
    redirectTo.searchParams.set("next", safeNextPath(searchParams.get("next")));
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "spotify",
      options: {
        redirectTo: redirectTo.toString(),
        scopes: "user-read-email user-top-read user-follow-read user-follow-modify streaming user-modify-playback-state user-read-playback-state",
      },
    });
    if (error || !data.url) return failure("Unable to connect to Spotify. Please try again.");
    return NextResponse.redirect(data.url);
  }

  const code = searchParams.get("code");
  if (!code) return failure("Spotify sign-in was not completed. Please try again.");
  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !session) return failure("Unable to complete sign-in. Please try again.");

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Authentication could not be verified");
    if (!session.provider_refresh_token) throw new Error("Spotify did not return a refresh token");

    const admin = createAdminClient();
    const { error: connectionError } = await admin.from("spotify_connections").upsert({
      user_id: user.id,
      refresh_token: session.provider_refresh_token,
      scope_version: 2,
      status: "connected",
      last_error: null,
      connected_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (connectionError) throw new Error("Spotify connection could not be saved");

    // Re-persist only Supabase tokens. Provider refresh credentials belong in
    // server-only storage, never in the browser-readable session cookie.
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (sessionError) throw new Error("Session could not be saved");

    // A temporary profile lookup failure must not discard a valid connection.
    if (session.provider_token) {
      try {
        const response = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${session.provider_token}` },
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        });
        if (response.ok) {
          const profile = await response.json();
          const spotifyIdentity = user.identities?.find(identity => identity.provider === "spotify");
          const spotifyUsername = spotifyIdentity?.identity_data?.sub;
          const { error: profileError } = await supabase.from("user_profiles").update({
            ...(typeof profile.id === "string" && { spotify_user_id: profile.id }),
            ...(typeof spotifyUsername === "string" && { spotify_user_name: spotifyUsername }),
            ...(typeof profile.display_name === "string" && { display_name: profile.display_name }),
            avatar_url: profile.images?.[0]?.url ?? null,
            updated_at: new Date().toISOString(),
          }).eq("user_id", user.id);
          if (profileError) console.error("Spotify profile sync failed");
        }
      } catch {
        console.error("Spotify profile lookup failed");
      }
    }
  } catch {
    // Clear the just-exchanged session, including provider tokens, on failure.
    await supabase.auth.signOut({ scope: "local" });
    return failure("Unable to save your Spotify connection. Please reconnect.");
  }

  return NextResponse.redirect(new URL(safeNextPath(searchParams.get("next")), origin));
}
