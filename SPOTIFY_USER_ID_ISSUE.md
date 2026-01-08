# Spotify User ID Issue - Technical Analysis

## The Problem

The follow/unfollow functionality is failing with `400 Bad Request` errors from the Spotify API because we're sending **Spotify usernames** (e.g., `ludwig100`, `brkay536`) instead of **Spotify user IDs** (e.g., `31l77fd3v4rxdm6ge23lfaoxxxx`) to the Spotify Follow API.

### Error Example
```
Error [SpotifyAPIError]: Spotify API error: Bad Request
GET /api/friends/check-follow?spotifyUserId=ludwig100 500
```

The Spotify API endpoint `/me/following?type=user` requires actual Spotify user IDs, not usernames.

---

## Current State Analysis

### 1. Database Schema

#### `user_profiles` Table
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  spotify_user_id TEXT UNIQUE, -- ⚠️ Currently stores USERNAME, not ID
  display_name TEXT,
  discriminator TEXT CHECK (discriminator ~ '^\d{4}$'),
  avatar_url TEXT,
  stats_visibility TEXT DEFAULT 'followers',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Current Data:**
```json
[
  {
    "display_name": "ludwig100",
    "discriminator": "7345",
    "spotify_user_id": "ludwig100"  // ❌ This is a username, not an ID
  },
  {
    "display_name": "Berkay Orhan",
    "discriminator": "2157",
    "spotify_user_id": "brkay536"  // ❌ This is a username, not an ID
  }
]
```

**Expected Data:**
```json
[
  {
    "display_name": "ludwig100",
    "discriminator": "7345",
    "spotify_user_id": "31l77fd3v4rxdm6ge23lfaoxxxx"  // ✅ Real Spotify user ID
  }
]
```

#### `follow_cache` Table
```sql
CREATE TABLE follow_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  spotify_friend_id TEXT, -- Also expects real Spotify user IDs
  is_mutual BOOLEAN DEFAULT false,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2. Database Triggers & Functions

#### Trigger: `create_user_profile_on_signup()`

This trigger runs when a new user signs up via Spotify OAuth:

```sql
CREATE OR REPLACE FUNCTION public.create_user_profile_on_signup()
RETURNS trigger AS $$
DECLARE
  v_spotify_user_id TEXT;
  v_display_name TEXT;
  v_avatar_url TEXT;
  v_discriminator TEXT;
BEGIN
  IF NEW.raw_app_meta_data->>'provider' = 'spotify' THEN
    -- Extract Spotify user data from identities
    SELECT 
      COALESCE(
        identity_data->>'sub',              -- ❌ Returns USERNAME
        NEW.raw_user_meta_data->>'provider_id'  -- Also returns USERNAME
      ),
      COALESCE(
        identity_data->>'name', 
        identity_data->>'full_name',
        'User'
      ),
      COALESCE(
        identity_data->'picture'->>'url',
        NEW.raw_user_meta_data->'picture'->>'url'
      )
    INTO 
      v_spotify_user_id,
      v_display_name,
      v_avatar_url
    FROM auth.identities
    WHERE user_id = NEW.id AND provider = 'spotify';
    
    -- Generate unique discriminator (0000-9999)
    -- ...
    
    -- Insert user profile
    INSERT INTO public.user_profiles (
      user_id,
      spotify_user_id,  -- ❌ Inserts USERNAME here
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
$$ LANGUAGE plpgsql;
```

**The Issue:** 
- `identity_data->>'sub'` returns the Spotify **username** (e.g., `ludwig100`)
- We need `identity_data->>'id'` or to fetch from Spotify API `/me` endpoint
- Spotify's OAuth token claims don't include the real user ID, only the username in `sub`

---

### 3. Application Code Flow

#### Sign-In Flow

**File:** `app/(public)/auth/callback/route.ts`

```typescript
// After Spotify OAuth callback
const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

// Currently tries to sync profile data
const spotifyIdentity = identities?.identities.find(i => i.provider === 'spotify');
const displayName = spotifyIdentity.identity_data.name;
const avatarUrl = spotifyIdentity.identity_data.picture?.url;

// Updates profile WITHOUT fetching real Spotify user ID
await supabase
  .from('user_profiles')
  .update({ display_name, avatar_url })
  .eq('user_id', user.id);
```

**What's Missing:**
- No call to Spotify API `/me` endpoint to get real user ID
- No update of `spotify_user_id` field with the correct value

---

#### Follow/Unfollow Flow

**File:** `lib/spotify/api.ts`

```typescript
// Get users the current user follows
export const getFollowingUsers = cache(async (after?: string) => {
  const endpoint = `/me/following?type=user&limit=50${after ? `&after=${after}` : ''}`;
  
  const response = await spotifyFetch<{
    users: {
      items: Array<{ id: string }>;  // ✅ Returns real Spotify user IDs
      cursors: { after: string | null };
    };
  }>(endpoint);

  return {
    users: response.users.items.map(user => user.id),
    nextCursor: response.users.cursors.after,
  };
});

// Check if following specific users
export async function checkIfFollowsUsers(spotifyUserIds: string[]) {
  const ids = spotifyUserIds.join(',');
  // ❌ Expects real Spotify user IDs, receives usernames
  return spotifyFetch<boolean[]>(`/me/following/contains?type=user&ids=${ids}`);
}
```

**File:** `app/api/friends/check-follow/route.ts`

```typescript
export async function GET(request: Request) {
  const spotifyUserId = searchParams.get("spotifyUserId");
  
  // ❌ This is "ludwig100" (username) from database
  const results = await checkMutualFollows([spotifyUserId]);
  
  // Fails because Spotify API expects IDs like "31l77fd3v4rxdm6ge23lfaoxxxx"
}
```

**File:** `app/(protected)/dashboard/friends/[username]/[discriminator]/page.tsx`

```typescript
// Fetches friend profile from database
const { data: friendProfile } = await supabase
  .from("user_profiles")
  .select("*")
  .eq("display_name", username)
  .eq("discriminator", discriminator)
  .single();

// ❌ friendProfile.spotify_user_id is "ludwig100" (username)
const followStatus = await checkFollowStatus(friendProfile.spotify_user_id);

// Passes username to follow button
<FriendFollowButton
  spotifyUserId={friendProfile.spotify_user_id}  // ❌ "ludwig100"
  initialFollowStatus={followStatus}
/>
```

---

## Why This Happens

### Spotify OAuth Token Claims

When users authenticate with Spotify OAuth, Supabase receives identity data:

```json
{
  "sub": "ludwig100",           // ❌ Username (not the user ID)
  "name": "ludwig100",
  "picture": { "url": "..." }
}
```

The `sub` claim contains the **username**, not the actual Spotify user ID.

### Spotify API `/me` Endpoint Returns Real ID

To get the actual Spotify user ID, you must call:

```bash
GET https://api.spotify.com/v1/me
Authorization: Bearer {access_token}
```

Response:
```json
{
  "id": "31l77fd3v4rxdm6ge23lfaoxxxx",  // ✅ Real Spotify user ID
  "display_name": "ludwig100",
  "email": "user@example.com",
  "images": [...]
}
```

---

## The Fix (In Progress)

### 1. Update Auth Callback to Fetch Real ID

**File:** `app/(public)/auth/callback/route.ts`

```typescript
// After successful OAuth exchange
if (spotifyIdentity?.identity_data) {
  let actualSpotifyUserId = spotifyIdentity.identity_data.sub;
  
  // Fetch REAL Spotify user ID from API
  try {
    const spotifyResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${session.provider_token}`
      }
    });
    
    if (spotifyResponse.ok) {
      const spotifyProfile = await spotifyResponse.json();
      actualSpotifyUserId = spotifyProfile.id; // ✅ Real ID
    }
  } catch (err) {
    console.error('Failed to fetch Spotify profile:', err);
  }
  
  // Update database with real ID
  await supabase
    .from('user_profiles')
    .update({
      spotify_user_id: actualSpotifyUserId,  // ✅ Now uses real ID
      display_name,
      avatar_url,
    })
    .eq('user_id', user.id);
}
```

**Status:** ⚠️ Has compilation error (needs `session` variable in scope)

---

### 2. Update Database Trigger (Future)

The trigger should also fetch the real Spotify user ID, not rely on `identity_data->>'sub'`:

```sql
-- Option 1: Store username temporarily, let app update it
-- Option 2: Trigger makes HTTP call to Spotify API (complex)
-- Option 3: App handles profile creation entirely (remove trigger)
```

---

### 3. Migrate Existing Data

Once auth callback is fixed, existing users need to re-login to get their profiles updated with real Spotify user IDs.

Or, create a manual migration:

```sql
-- Manual update (would need access to Spotify API)
-- This requires fetching each user's real ID from Spotify API
-- Cannot be done purely in SQL
```

---

## Summary

| Component | Current State | Expected State |
|-----------|--------------|----------------|
| `user_profiles.spotify_user_id` | Username (e.g., `ludwig100`) | Real ID (e.g., `31l77fd3v4rx...`) |
| Database trigger | Extracts `sub` claim (username) | Should get real ID from API |
| Auth callback | Only updates name/avatar | Should fetch & store real ID |
| Follow API calls | Sends usernames to Spotify | Should send real IDs |
| Data in `auth.identities` | `sub` = username | Spotify limitation, can't change |

---

## Next Steps

1. **Fix auth callback** - Complete the `/me` fetch logic (fix `session` variable error)
2. **Test with real users** - Have existing users sign out and back in
3. **Verify follow functionality** - Test with real Spotify user IDs
4. **Consider trigger update** - Decide if trigger should also fetch real ID
5. **Data migration** - Force re-auth or manual ID fetch for existing users

---

## Related Files

- `app/(public)/auth/callback/route.ts` - OAuth callback handler
- `lib/spotify/api.ts` - Spotify API functions
- `app/api/friends/check-follow/route.ts` - Follow status checker
- `app/api/friends/follow/route.ts` - Follow user endpoint
- `app/api/friends/unfollow/route.ts` - Unfollow user endpoint
- `components/friend-follow-button.tsx` - Follow UI component
- `app/(protected)/dashboard/friends/[username]/[discriminator]/page.tsx` - Friend profile page

---

**Last Updated:** January 8, 2026
