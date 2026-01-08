import { NextResponse } from "next/server";
import { getAuthenticatedUser, serverErrorResponse } from "@/lib/api/utils";
import { getAllFollowingUsers, checkMutualFollows } from "@/lib/spotify/api";

export async function POST() {
  try {
    const authResult = await getAuthenticatedUser();
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { user, supabase } = authResult;
    
    // Get current user's Spotify ID
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("spotify_user_id")
      .eq("user_id", user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    // Get all users current user follows on Spotify
    const followingUserIds = await getAllFollowingUsers();
    
    if (followingUserIds.length === 0) {
      return NextResponse.json({ 
        mutualFriends: [], 
        followBackSuggestions: [] 
      });
    }
    
    // Find which followed users have accounts in our app
    const { data: appUsers } = await supabase
      .from("user_profiles")
      .select("user_id, spotify_user_id, display_name, discriminator, avatar_url")
      .in("spotify_user_id", followingUserIds);
    
    if (!appUsers || appUsers.length === 0) {
      return NextResponse.json({ 
        mutualFriends: [], 
        followBackSuggestions: [] 
      });
    }
    
    // Check which follows are mutual
    const appUserSpotifyIds = appUsers.map(u => u.spotify_user_id);
    const mutualResults = await checkMutualFollows(appUserSpotifyIds);
    
    // Update follow cache
    const cacheUpdates = mutualResults.map(result => ({
      user_id: user.id,
      spotify_friend_id: result.spotifyUserId,
      is_mutual: result.isMutual,
      cached_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    
    // Upsert follow cache
    await supabase
      .from("follow_cache")
      .upsert(cacheUpdates, {
        onConflict: "user_id,spotify_friend_id",
      });
    
    // Separate mutual friends from follow-back suggestions
    const mutualFriends = appUsers
      .filter(user => {
        const result = mutualResults.find(r => r.spotifyUserId === user.spotify_user_id);
        return result?.isMutual;
      })
      .map(user => ({
        userId: user.user_id,
        spotifyUserId: user.spotify_user_id,
        displayName: user.display_name,
        discriminator: user.discriminator,
        username: `${user.display_name}#${user.discriminator}`,
        avatarUrl: user.avatar_url,
      }));
    
    const followBackSuggestions = appUsers
      .filter(user => {
        const result = mutualResults.find(r => r.spotifyUserId === user.spotify_user_id);
        return result?.isFollowing && !result?.isMutual;
      })
      .map(user => ({
        userId: user.user_id,
        spotifyUserId: user.spotify_user_id,
        displayName: user.display_name,
        discriminator: user.discriminator,
        username: `${user.display_name}#${user.discriminator}`,
        avatarUrl: user.avatar_url,
      }));
    
    return NextResponse.json({
      success: true,
      mutualFriends,
      followBackSuggestions,
    });
  } catch (error) {
    console.error("Error syncing friends:", error);
    return serverErrorResponse("Failed to sync friends");
  }
}
