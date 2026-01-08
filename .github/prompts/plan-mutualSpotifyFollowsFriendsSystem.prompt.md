# Plan: Mutual Spotify Follows Friends System

Implement a comprehensive social features system that allows users to view their Spotify friends' stats. The system uses mutual Spotify follows as the friendship mechanism, implements Discord-style usernames for identification, provides in-app follow/unfollow functionality, supports friend discovery through search, respects privacy settings, and uses intelligent caching for performance.

## Architecture Overview

### Database Schema
- **user_profiles**: Public user identity with Discord-style discriminators
- **follow_cache**: Cached mutual follow verification results (1-hour TTL)
- **Existing tables**: Enhanced with RLS policies for friends access

### API Integration
- **Spotify Follow API**: Real-time follow/unfollow operations
- **Spotify Users API**: Fetch following list for mutual verification
- **Cache Strategy**: Return stale data immediately + background refresh

### Privacy Model
- **Default**: `followers` visibility (mutual follows can view stats)
- **Options**: `public` (anyone), `followers` (mutual only), `private` (nobody)
- **Search**: All users searchable, but stats access respects privacy + mutual follow

## Detailed Implementation Steps

### Step 1: Update Spotify OAuth Scopes

**Location**: Supabase Dashboard > Authentication > Providers > Spotify

**Actions**:
1. Add `user-follow-read` scope to existing `user-read-email user-top-read` scopes
2. Add `user-follow-modify` scope for in-app follow/unfollow functionality
3. Save changes (existing users will need to re-authenticate)

**Files to Update**:

#### Update Privacy Policy
File: `app/(public)/privacy/page.tsx`

Add new section after "Spotify API Usage":
```tsx
<section className="mt-8">
  <h2 className="text-2xl font-semibold">5. Social Features & Friend Connections</h2>
  <p className="mt-4 text-muted-foreground">
    To enable friend features, we request additional Spotify permissions:
  </p>
  <ul className="mt-4 list-disc pl-6 text-muted-foreground space-y-2">
    <li><code className="bg-muted px-1 rounded">user-follow-read</code>: To see who you follow on Spotify</li>
    <li><code className="bg-muted px-1 rounded">user-follow-modify</code>: To enable following friends from within the app</li>
  </ul>
  <p className="mt-4 text-muted-foreground">
    Friends can view your stats only if you mutually follow each other on Spotify AND you have enabled 
    stats visibility for followers in your profile settings.
  </p>
</section>
```

#### Update Terms of Service
File: `app/(public)/terms/page.tsx`

Add new section after "Account Requirements":
```tsx
<section className="mt-8">
  <h2 className="text-2xl font-semibold">4. Social Features</h2>
  <p className="mt-4 text-muted-foreground">
    The Service offers social features that allow users to view friends' listening statistics:
  </p>
  <ul className="mt-4 list-disc pl-6 text-muted-foreground space-y-2">
    <li>Friendships are based on mutual Spotify follows (you both follow each other)</li>
    <li>Stats visibility is controlled by your privacy settings (default: followers only)</li>
    <li>You can search for other users by display name</li>
    <li>Follow/unfollow actions sync with your Spotify account</li>
  </ul>
</section>
```

### Step 2: Create Database Schema

**Location**: Create new migration file via Supabase MCP tool

**Migration Name**: `create_friends_system`

**SQL Schema**:

```sql
-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spotify_user_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  discriminator TEXT NOT NULL CHECK (discriminator ~ '^\d{4}$'),
  avatar_url TEXT,
  stats_visibility TEXT NOT NULL DEFAULT 'followers' 
    CHECK (stats_visibility IN ('public', 'followers', 'private')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_display_name_discriminator UNIQUE (display_name, discriminator)
);

COMMENT ON TABLE public.user_profiles IS 'Public user profiles with Discord-style usernames';
COMMENT ON COLUMN public.user_profiles.spotify_user_id IS 'Spotify user ID for follow verification';
COMMENT ON COLUMN public.user_profiles.discriminator IS 'Random 4-digit discriminator (like Discord)';
COMMENT ON COLUMN public.user_profiles.stats_visibility IS 'Who can view this user stats: public, followers (mutual follows), private';

-- Create follow_cache table
CREATE TABLE IF NOT EXISTS public.follow_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spotify_friend_id TEXT NOT NULL,
  is_mutual BOOLEAN NOT NULL DEFAULT FALSE,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_friend UNIQUE (user_id, spotify_friend_id)
);

COMMENT ON TABLE public.follow_cache IS 'Cached Spotify follow verification results (1-hour TTL)';
COMMENT ON COLUMN public.follow_cache.spotify_friend_id IS 'Spotify user ID of the friend';
COMMENT ON COLUMN public.follow_cache.is_mutual IS 'True if both users follow each other';
COMMENT ON COLUMN public.follow_cache.cached_at IS 'When this follow status was last verified';

-- Create indexes for performance
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_spotify_user_id ON public.user_profiles(spotify_user_id);
CREATE INDEX idx_user_profiles_display_name_gin ON public.user_profiles USING gin(display_name gin_trgm_ops);
CREATE INDEX idx_follow_cache_user_id ON public.follow_cache(user_id);
CREATE INDEX idx_follow_cache_spotify_friend_id ON public.follow_cache(spotify_friend_id);
CREATE INDEX idx_follow_cache_mutual_valid ON public.follow_cache(user_id, is_mutual, cached_at) WHERE is_mutual = TRUE;

-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to generate random 4-digit discriminator
CREATE OR REPLACE FUNCTION generate_discriminator(p_display_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_discriminator TEXT;
  v_attempts INT := 0;
  v_max_attempts INT := 100;
BEGIN
  LOOP
    -- Generate random 4-digit number
    v_discriminator := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Check if this combination exists
    IF NOT EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE display_name = p_display_name 
      AND discriminator = v_discriminator
    ) THEN
      RETURN v_discriminator;
    END IF;
    
    v_attempts := v_attempts + 1;
    IF v_attempts >= v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique discriminator after % attempts', v_max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- Function to auto-populate user profile on Spotify auth
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_spotify_user_id TEXT;
  v_display_name TEXT;
  v_avatar_url TEXT;
  v_discriminator TEXT;
BEGIN
  -- Only process Spotify auth signups
  IF NEW.raw_app_meta_data->>'provider' = 'spotify' THEN
    -- Extract Spotify user data from identities
    SELECT 
      identity_data->>'sub',
      COALESCE(identity_data->>'name', identity_data->>'full_name', 'User'),
      identity_data->'picture'->>'url'
    INTO 
      v_spotify_user_id,
      v_display_name,
      v_avatar_url
    FROM auth.identities
    WHERE user_id = NEW.id 
    AND provider = 'spotify'
    LIMIT 1;
    
    -- Generate discriminator
    v_discriminator := generate_discriminator(v_display_name);
    
    -- Insert user profile
    INSERT INTO public.user_profiles (
      user_id,
      spotify_user_id,
      display_name,
      discriminator,
      avatar_url,
      stats_visibility
    ) VALUES (
      NEW.id,
      v_spotify_user_id,
      v_display_name,
      v_discriminator,
      v_avatar_url,
      'followers'
    ) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();

-- Function to check if mutual follow exists and is cached within 1 hour
CREATE OR REPLACE FUNCTION check_mutual_follow_cached(
  p_requester_id UUID,
  p_target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_target_spotify_id TEXT;
  v_is_mutual BOOLEAN;
BEGIN
  -- Get target user's Spotify ID
  SELECT spotify_user_id INTO v_target_spotify_id
  FROM public.user_profiles
  WHERE user_id = p_target_user_id;
  
  IF v_target_spotify_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check cache for mutual follow within 1 hour
  SELECT is_mutual INTO v_is_mutual
  FROM public.follow_cache
  WHERE user_id = p_requester_id
    AND spotify_friend_id = v_target_spotify_id
    AND is_mutual = TRUE
    AND cached_at > NOW() - INTERVAL '1 hour';
  
  RETURN COALESCE(v_is_mutual, FALSE);
END;
$$;

-- Enable RLS on new tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view all public profiles"
  ON public.user_profiles
  FOR SELECT
  USING (TRUE); -- All profiles are searchable

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for follow_cache
CREATE POLICY "Users can view their own follow cache"
  ON public.follow_cache
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own follow cache"
  ON public.follow_cache
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own follow cache"
  ON public.follow_cache
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follow cache"
  ON public.follow_cache
  FOR DELETE
  USING (auth.uid() = user_id);

-- Update existing ranking tables to allow friends access
CREATE POLICY "Users can view friends' artist rankings"
  ON public.artist_rankings
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    (
      EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = artist_rankings.user_id
        AND up.stats_visibility IN ('public', 'followers')
      )
      AND (
        -- Public visibility: anyone can view
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.user_id = artist_rankings.user_id
          AND up.stats_visibility = 'public'
        )
        OR
        -- Followers visibility: only mutual follows
        (
          EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = artist_rankings.user_id
            AND up.stats_visibility = 'followers'
          )
          AND check_mutual_follow_cached(auth.uid(), artist_rankings.user_id)
        )
      )
    )
  );

CREATE POLICY "Users can view friends' track rankings"
  ON public.track_rankings
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    (
      EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = track_rankings.user_id
        AND up.stats_visibility IN ('public', 'followers')
      )
      AND (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.user_id = track_rankings.user_id
          AND up.stats_visibility = 'public'
        )
        OR
        (
          EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = track_rankings.user_id
            AND up.stats_visibility = 'followers'
          )
          AND check_mutual_follow_cached(auth.uid(), track_rankings.user_id)
        )
      )
    )
  );

CREATE POLICY "Users can view friends' album rankings"
  ON public.album_rankings
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    (
      EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = album_rankings.user_id
        AND up.stats_visibility IN ('public', 'followers')
      )
      AND (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.user_id = album_rankings.user_id
          AND up.stats_visibility = 'public'
        )
        OR
        (
          EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = album_rankings.user_id
            AND up.stats_visibility = 'followers'
          )
          AND check_mutual_follow_cached(auth.uid(), album_rankings.user_id)
        )
      )
    )
  );

CREATE POLICY "Users can view friends' snapshots"
  ON public.snapshots
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    (
      EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = snapshots.user_id
        AND up.stats_visibility IN ('public', 'followers')
      )
      AND (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.user_id = snapshots.user_id
          AND up.stats_visibility = 'public'
        )
        OR
        (
          EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = snapshots.user_id
            AND up.stats_visibility = 'followers'
          )
          AND check_mutual_follow_cached(auth.uid(), snapshots.user_id)
        )
      )
    )
  );
```

### Step 3: Add Spotify Follow API Functions

**Location**: `lib/spotify/api.ts`

**New TypeScript Types** (add to `lib/spotify/types.ts`):

```typescript
// Spotify Follow API types
export interface SpotifyFollowedUsersResponse {
  artists: {
    items: SpotifyArtist[];
    next: string | null;
    total: number;
    cursors: {
      after: string | null;
    };
    limit: number;
    href: string;
  };
}

export interface SpotifyUserSimple {
  id: string;
  display_name: string;
  external_urls: {
    spotify: string;
  };
  followers?: {
    total: number;
  };
  href: string;
  images: SpotifyImage[];
  type: "user";
  uri: string;
}

export interface FollowCheckResult {
  spotifyUserId: string;
  isFollowing: boolean;
  isMutual: boolean;
}

export interface MutualFriendsResult {
  mutualFriends: Array<{
    spotifyUserId: string;
    displayName: string;
    avatarUrl: string | null;
    username: string;
    discriminator: string;
  }>;
  followBackSuggestions: Array<{
    spotifyUserId: string;
    displayName: string;
    avatarUrl: string | null;
  }>;
}
```

**New Functions** (add to `lib/spotify/api.ts`):

```typescript
// Get users that the current user follows (with pagination)
export const getFollowingUsers = cache(async (
  after?: string
): Promise<{ users: string[]; nextCursor: string | null }> => {
  const endpoint = after 
    ? `/me/following?type=user&limit=50&after=${after}`
    : `/me/following?type=user&limit=50`;
  
  const response = await spotifyFetch<{
    artists: {
      items: Array<{ id: string }>;
      next: string | null;
      cursors: { after: string | null };
    };
  }>(endpoint);

  return {
    users: response.artists.items.map(user => user.id),
    nextCursor: response.artists.cursors.after,
  };
});

// Get all users the current user follows (handles pagination automatically)
export async function getAllFollowingUsers(): Promise<string[]> {
  const allUsers: string[] = [];
  let cursor: string | null = null;
  
  do {
    const { users, nextCursor } = await getFollowingUsers(cursor || undefined);
    allUsers.push(...users);
    cursor = nextCursor;
  } while (cursor);
  
  return allUsers;
}

// Check if current user follows specific users (max 50 IDs per call)
export async function checkIfFollowsUsers(spotifyUserIds: string[]): Promise<boolean[]> {
  if (spotifyUserIds.length === 0) return [];
  if (spotifyUserIds.length > 50) {
    throw new Error("Maximum 50 user IDs per request");
  }
  
  const ids = spotifyUserIds.join(',');
  return spotifyFetch<boolean[]>(`/me/following/contains?type=user&ids=${ids}`);
}

// Check mutual follows for multiple users (batches requests if needed)
export async function checkMutualFollows(
  spotifyUserIds: string[]
): Promise<FollowCheckResult[]> {
  if (spotifyUserIds.length === 0) return [];
  
  // Get all users current user follows
  const followingUsers = await getAllFollowingUsers();
  const followingSet = new Set(followingUsers);
  
  const results: FollowCheckResult[] = [];
  
  // Batch check if these users follow back (50 IDs at a time)
  for (let i = 0; i < spotifyUserIds.length; i += 50) {
    const batch = spotifyUserIds.slice(i, i + 50);
    const followsBack = await checkIfFollowsUsers(batch);
    
    batch.forEach((spotifyUserId, index) => {
      const isFollowing = followingSet.has(spotifyUserId);
      const isFollowedBack = followsBack[index];
      const isMutual = isFollowing && isFollowedBack;
      
      results.push({
        spotifyUserId,
        isFollowing,
        isMutual,
      });
    });
  }
  
  return results;
}

// Follow a user on Spotify
export async function followUser(spotifyUserId: string): Promise<void> {
  const accessToken = await getAccessToken();
  
  const response = await fetch(
    `${SPOTIFY_API_BASE}/me/following?type=user&ids=${spotifyUserId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new SpotifyAPIError(
      `Failed to follow user: ${response.statusText}`,
      response.status
    );
  }
}

// Unfollow a user on Spotify
export async function unfollowUser(spotifyUserId: string): Promise<void> {
  const accessToken = await getAccessToken();
  
  const response = await fetch(
    `${SPOTIFY_API_BASE}/me/following?type=user&ids=${spotifyUserId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new SpotifyAPIError(
      `Failed to unfollow user: ${response.statusText}`,
      response.status
    );
  }
}
```

### Step 4: Create Friends API Routes

**4.1: Friends Sync Route**

File: `app/api/friends/sync/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAllFollowingUsers, checkMutualFollows } from "@/lib/spotify/api";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
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
    return NextResponse.json(
      { error: "Failed to sync friends" },
      { status: 500 }
    );
  }
}
```

**4.2: Friends Search Route**

File: `app/api/friends/search/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }
    
    // Search profiles by display name (fuzzy match)
    const { data: profiles, error } = await supabase
      .from("user_profiles")
      .select("user_id, spotify_user_id, display_name, discriminator, avatar_url, stats_visibility")
      .ilike("display_name", `%${query}%`)
      .neq("user_id", user.id) // Exclude current user
      .limit(20);
    
    if (error) {
      throw error;
    }
    
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ results: [] });
    }
    
    // Get follow status for each profile
    const spotifyIds = profiles.map(p => p.spotify_user_id);
    
    const { data: followCache } = await supabase
      .from("follow_cache")
      .select("spotify_friend_id, is_mutual, cached_at")
      .eq("user_id", user.id)
      .in("spotify_friend_id", spotifyIds)
      .gte("cached_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()); // 1 hour
    
    const followMap = new Map(
      followCache?.map(fc => [fc.spotify_friend_id, fc.is_mutual]) || []
    );
    
    const results = profiles.map(profile => ({
      userId: profile.user_id,
      spotifyUserId: profile.spotify_user_id,
      displayName: profile.display_name,
      discriminator: profile.discriminator,
      username: `${profile.display_name}#${profile.discriminator}`,
      avatarUrl: profile.avatar_url,
      statsVisibility: profile.stats_visibility,
      isMutualFollow: followMap.get(profile.spotify_user_id) || false,
      canViewStats: 
        profile.stats_visibility === "public" ||
        (profile.stats_visibility === "followers" && followMap.get(profile.spotify_user_id)),
    }));
    
    return NextResponse.json({ results });
    
  } catch (error) {
    console.error("Error searching friends:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
```

**4.3: Follow User Route**

File: `app/api/friends/follow/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { followUser } from "@/lib/spotify/api";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { spotifyUserId } = await request.json();
    
    if (!spotifyUserId) {
      return NextResponse.json(
        { error: "spotifyUserId is required" },
        { status: 400 }
      );
    }
    
    // Follow on Spotify
    await followUser(spotifyUserId);
    
    // Invalidate cache for this user
    await supabase
      .from("follow_cache")
      .delete()
      .eq("user_id", user.id)
      .eq("spotify_friend_id", spotifyUserId);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error following user:", error);
    return NextResponse.json(
      { error: "Failed to follow user" },
      { status: 500 }
    );
  }
}
```

**4.4: Unfollow User Route**

File: `app/api/friends/unfollow/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unfollowUser } from "@/lib/spotify/api";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { spotifyUserId } = await request.json();
    
    if (!spotifyUserId) {
      return NextResponse.json(
        { error: "spotifyUserId is required" },
        { status: 400 }
      );
    }
    
    // Unfollow on Spotify
    await unfollowUser(spotifyUserId);
    
    // Update cache to reflect unfollowed status
    await supabase
      .from("follow_cache")
      .update({
        is_mutual: false,
        cached_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("spotify_friend_id", spotifyUserId);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return NextResponse.json(
      { error: "Failed to unfollow user" },
      { status: 500 }
    );
  }
}
```

### Step 5: Build Friends Dashboard UI

**5.1: Friends Page with Search**

File: `app/(protected)/dashboard/friends/page.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, UserPlus, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";

interface Friend {
  userId: string;
  spotifyUserId: string;
  displayName: string;
  discriminator: string;
  username: string;
  avatarUrl: string | null;
  statsVisibility?: string;
  isMutualFollow?: boolean;
  canViewStats?: boolean;
}

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const queryClient = useQueryClient();
  
  // Sync friends on page load
  const { data: syncData, isLoading: isSyncing, refetch: refetchSync } = useQuery({
    queryKey: ["friends", "sync"],
    queryFn: async () => {
      const response = await fetch("/api/friends/sync", { method: "POST" });
      if (!response.ok) throw new Error("Failed to sync friends");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Search users
  const { data: searchData, isLoading: isSearching } = useQuery({
    queryKey: ["friends", "search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return { results: [] };
      const response = await fetch(`/api/friends/search?q=${encodeURIComponent(debouncedSearch)}`);
      if (!response.ok) throw new Error("Failed to search users");
      return response.json();
    },
    enabled: debouncedSearch.length >= 2,
  });
  
  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async (spotifyUserId: string) => {
      const response = await fetch("/api/friends/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotifyUserId }),
      });
      if (!response.ok) throw new Error("Failed to follow user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });
  
  const mutualFriends = syncData?.mutualFriends || [];
  const suggestions = syncData?.followBackSuggestions || [];
  const searchResults = searchData?.results || [];
  
  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Friends</h1>
        <p className="text-muted-foreground">
          View stats from friends you mutually follow on Spotify
        </p>
      </div>
      
      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users by display name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => refetchSync()}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Search Results */}
      {searchQuery && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              {isSearching ? "Searching..." : `Found ${searchResults.length} users`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSearching ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No users found matching "{searchQuery}"
              </p>
            ) : (
              <div className="space-y-3">
                {searchResults.map((user: Friend) => (
                  <FriendCard
                    key={user.userId}
                    friend={user}
                    onFollow={() => followMutation.mutate(user.spotifyUserId)}
                    isFollowing={followMutation.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Mutual Friends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mutual Friends
          </CardTitle>
          <CardDescription>
            {isSyncing ? "Loading..." : `${mutualFriends.length} friends`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSyncing ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : mutualFriends.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <p className="mt-4 text-sm text-muted-foreground">
                No mutual friends yet. Follow friends on Spotify to see their stats here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {mutualFriends.map((friend: Friend) => (
                <FriendCard key={friend.userId} friend={friend} isMutual />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Follow Back Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Suggested
            </CardTitle>
            <CardDescription>
              These users follow you on Spotify. Follow them back to become mutual friends.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((user: Friend) => (
                <FriendCard
                  key={user.userId}
                  friend={user}
                  onFollow={() => followMutation.mutate(user.spotifyUserId)}
                  isFollowing={followMutation.isPending}
                  showFollowButton
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface FriendCardProps {
  friend: Friend;
  isMutual?: boolean;
  onFollow?: () => void;
  isFollowing?: boolean;
  showFollowButton?: boolean;
}

function FriendCard({ friend, isMutual, onFollow, isFollowing, showFollowButton }: FriendCardProps) {
  const canView = friend.canViewStats !== false;
  
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={friend.avatarUrl || undefined} alt={friend.displayName} />
          <AvatarFallback>{friend.displayName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {friend.displayName}
            <span className="text-muted-foreground">#{friend.discriminator}</span>
          </p>
          <div className="flex items-center gap-2 mt-1">
            {isMutual && (
              <Badge variant="secondary" className="text-xs">
                Mutual
              </Badge>
            )}
            {friend.statsVisibility === "private" && (
              <Badge variant="outline" className="text-xs">
                Private
              </Badge>
            )}
            {friend.statsVisibility === "public" && (
              <Badge variant="default" className="text-xs">
                Public
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {showFollowButton && onFollow && (
            <Button
              size="sm"
              onClick={onFollow}
              disabled={isFollowing}
            >
              {isFollowing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Follow Back
                </>
              )}
            </Button>
          )}
          
          {canView ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/friends/${friend.displayName}/${friend.discriminator}`}>
                <ExternalLink className="h-4 w-4 mr-1" />
                View Stats
              </Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled>
              Private
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**5.2: Custom Debounce Hook**

File: `hooks/use-debounce.ts`

```typescript
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

**5.3: Friend Profile Page**

File: `app/(protected)/dashboard/friends/[username]/[discriminator]/page.tsx`

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import { ArtistsList } from "@/components/artists-list";
import { TracksList } from "@/components/tracks-list";
import { AlbumsList } from "@/components/albums-list";
import { TimeRangeTabs } from "@/components/ui/time-range-tabs";
import type { TimeRange } from "@/lib/spotify/types";

interface Props {
  params: Promise<{ username: string; discriminator: string }>;
  searchParams: Promise<{ timeRange?: TimeRange }>;
}

export default async function FriendProfilePage({ params, searchParams }: Props) {
  const { username, discriminator } = await params;
  const { timeRange = "medium_term" } = await searchParams;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/");
  }
  
  // Find friend profile
  const { data: friendProfile, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("display_name", username)
    .eq("discriminator", discriminator)
    .single();
  
  if (error || !friendProfile) {
    notFound();
  }
  
  // Check if user can view this profile
  const canView = friendProfile.stats_visibility === "public" ||
    (friendProfile.stats_visibility === "followers" && 
     await checkMutualFollow(supabase, user.id, friendProfile.user_id));
  
  if (!canView) {
    return (
      <div className="container mx-auto max-w-4xl py-12">
        <Card>
          <CardHeader className="text-center">
            <Avatar className="mx-auto h-24 w-24 mb-4">
              <AvatarImage src={friendProfile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {friendProfile.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <CardTitle>{friendProfile.display_name}#{friendProfile.discriminator}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                This user's stats are private. You need to be mutual follows on Spotify to view their stats.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Fetch friend's rankings
  const [artistsData, tracksData, albumsData] = await Promise.all([
    supabase
      .from("artist_rankings")
      .select("*")
      .eq("user_id", friendProfile.user_id)
      .order("rank", { ascending: true })
      .limit(50),
    supabase
      .from("track_rankings")
      .select("*")
      .eq("user_id", friendProfile.user_id)
      .order("rank", { ascending: true })
      .limit(50),
    supabase
      .from("album_rankings")
      .select("*")
      .eq("user_id", friendProfile.user_id)
      .order("rank", { ascending: true })
      .limit(50),
  ]);
  
  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={friendProfile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {friendProfile.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl">
                {friendProfile.display_name}
                <span className="text-muted-foreground">#{friendProfile.discriminator}</span>
              </CardTitle>
              <CardDescription className="mt-1">
                <Badge variant="secondary">
                  {friendProfile.stats_visibility === "public" ? "Public Profile" : "Mutual Friend"}
                </Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Time Range Tabs */}
      <TimeRangeTabs currentTimeRange={timeRange} />
      
      {/* Rankings */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Artists</CardTitle>
          </CardHeader>
          <CardContent>
            <ArtistsList artists={artistsData.data || []} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Top Tracks</CardTitle>
          </CardHeader>
          <CardContent>
            <TracksList tracks={tracksData.data || []} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Top Albums</CardTitle>
          </CardHeader>
          <CardContent>
            <AlbumsList albums={albumsData.data || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function checkMutualFollow(supabase: any, requesterId: string, targetId: string): Promise<boolean> {
  const { data: targetProfile } = await supabase
    .from("user_profiles")
    .select("spotify_user_id")
    .eq("user_id", targetId)
    .single();
  
  if (!targetProfile) return false;
  
  const { data: cache } = await supabase
    .from("follow_cache")
    .select("is_mutual")
    .eq("user_id", requesterId)
    .eq("spotify_friend_id", targetProfile.spotify_user_id)
    .gte("cached_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .single();
  
  return cache?.is_mutual || false;
}
```

### Step 6: Update Profile Page with Privacy Controls

**Location**: `app/(protected)/profile/page.tsx`

Add after the profile card and before data stats:

```typescript
{/* Privacy & Username Settings */}
<Card>
  <CardHeader>
    <CardTitle>Privacy & Profile Settings</CardTitle>
    <CardDescription>
      Control who can view your listening stats
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    <div className="space-y-3">
      <label className="text-sm font-medium">Username</label>
      <div className="flex items-center gap-2">
        <Input
          value={`${userProfile?.display_name}#${userProfile?.discriminator}`}
          disabled
          className="flex-1"
        />
        <Button variant="outline" size="sm">
          Edit Name
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Changing your display name will generate a new discriminator if there's a conflict
      </p>
    </div>
    
    <Separator />
    
    <div className="space-y-3">
      <label className="text-sm font-medium">Stats Visibility</label>
      <RadioGroup
        value={userProfile?.stats_visibility || "followers"}
        onValueChange={handleVisibilityChange}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="public" id="public" />
          <Label htmlFor="public" className="flex-1 cursor-pointer">
            <div className="flex items-center justify-between">
              <span>Public</span>
              <span className="text-xs text-muted-foreground">Anyone can view</span>
            </div>
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="followers" id="followers" />
          <Label htmlFor="followers" className="flex-1 cursor-pointer">
            <div className="flex items-center justify-between">
              <span>Followers Only</span>
              <span className="text-xs text-muted-foreground">Mutual Spotify follows</span>
            </div>
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="private" id="private" />
          <Label htmlFor="private" className="flex-1 cursor-pointer">
            <div className="flex items-center justify-between">
              <span>Private</span>
              <span className="text-xs text-muted-foreground">Only you</span>
            </div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  </CardContent>
</Card>
```

### Step 7: Add Friends Link to Sidebar

**Location**: `components/app-sidebar.tsx`

Update the `navItems` array to include friends:

```typescript
const navItems = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/artists", label: "Artists", icon: Music },
  { href: "/dashboard/tracks", label: "Tracks", icon: ListMusic },
  { href: "/dashboard/albums", label: "Albums", icon: Disc },
  { href: "/dashboard/genres", label: "Genres", icon: Radio },
  { href: "/dashboard/friends", label: "Friends", icon: Users }, // Add this
];
```

Import Users icon at the top:
```typescript
import { Users } from "lucide-react";
```

## Testing Checklist

- [ ] Updated Spotify OAuth scopes in Supabase Dashboard
- [ ] Ran migration successfully (creates tables, triggers, functions, RLS policies)
- [ ] Privacy and Terms pages updated with new permissions
- [ ] Spotify API functions working (follow/unfollow/check)
- [ ] Friends sync API returns mutual friends and suggestions
- [ ] Search API finds users by display name
- [ ] Follow/unfollow buttons trigger Spotify API correctly
- [ ] Cache invalidation works after follow/unfollow
- [ ] Friends dashboard displays correctly
- [ ] Friend profile pages respect privacy settings
- [ ] RLS policies allow friends to view rankings
- [ ] Username discriminators generate uniquely
- [ ] Profile trigger creates user_profiles on signup
- [ ] Sidebar shows Friends navigation item

## Performance Optimizations

1. **Database Indexes**: GIN index on display_name for fast fuzzy search
2. **Caching Strategy**: 1-hour TTL on follow verification, return stale + background refresh
3. **React Query**: 5-minute stale time on friends sync, automatic refetch on window focus
4. **Batch API Calls**: Check 50 mutual follows per Spotify API request
5. **Optimistic Updates**: UI updates immediately on follow/unfollow

## Security Considerations

1. **RLS Policies**: All ranking tables check privacy + mutual follow via PostgreSQL function
2. **Auth Verification**: Every API route validates user session
3. **Privacy Default**: New users default to 'followers' visibility
4. **Cache Expiry**: Stale cache (>1 hour) treated as no mutual follow
5. **SQL Injection**: All queries use parameterized Supabase client methods
