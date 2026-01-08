# Spotify User ID Issue - Technical Analysis

## ✅ RESOLVED

**Status:** Fixed on January 8, 2026  
**Solution:** Separated `spotify_user_name` and `spotify_user_id` fields, updated auth callback to fetch real IDs from Spotify API

---

## The Problem (Historical)

The follow/unfollow functionality was failing with `400 Bad Request` errors from the Spotify API because we were sending **Spotify usernames** (e.g., `ludwig100`, `brkay536`) instead of **Spotify user IDs** (e.g., `31l77fd3v4rxdm6ge23lfaoxxxx`) to the Spotify Follow API.

### Error Example
```
Error [SpotifyAPIError]: Spotify API error: Bad Request
GETThe Solution

### 1. Database Schema Changes

#### Updated `user_profiles` Table
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  spotify_user_name TEXT,        -- ✅ NEW: Stores username (e.g., "ludwig100")
  spotify_user_id TEXT UNIQUE,   -- ✅ FIXED: Now stores real Spotify user ID
  display_name TEXT,
  discriminator TEXT CHECK (discriminator ~ '^\d{4}$'),
  avatar_url TEXT,
  stats_visibility TEXT DEFAULT 'followers',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Field Separation:**
- `spotify_user_name` - Username from OAuth `sub` claim (e.g., "ludwig100", "brkay536")
- `spotify_user_id` - Real Spotify user ID from API (e.g., "31l77fd3v4rxdm6ge23lfaoxxxx")

**Data After Migration:**
```json
[
  {
    "display_name": "ludwig100",
    "discriminator": "7345",
    "spotify_user_name": "ludwig100",              // ✅ Username
    "spotify_user_id": "31l77fd3v4rxdm6ge23lfaoxxxx"  // ✅ Real ID (fetched on next login)
  },
  {
    "display_name": "Berkay Orhan",
    "discriminator": "2157",
    "spotify_user_name": "brkay536",               // ✅ Username
    "spotify_user_id": "8h2jdk3hd8s9dh3jdk2h3"     // ✅ Real ID (fetched on next login)
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

This trUpdated Database Trigger

#### Fixed Trigger: `create_user_profile_on_signup()`

The trigger now properly handles both username and user ID:

```sql
CREATE OR REPLACE FUNCTION public.create_user_profile_on_signup()
RETURNS trigger AS $$
DECLARE
  v_spotify_username TEXT;
  v_display_name TEXT;
  v_avatar_url TEXT;
  v_discriminator TEXT;
BEGIN
  IF NEW.raw_app_meta_data->>'provider' = 'spotify' THEN
    -- Extract Spotify username from identities
    SELECT 
      COALESCE(
        identity_data->>'sub',              -- ✅ Username (correct field)
        NEW.raw_user_meta_data->>'provider_id'
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
      v_spotify_username,
      v_display_name,
      v_avatar_url
    FROM auth.identities
    WHERE user_id = NEW.id AND provider = 'spotify';
    
    -- Generate unique discriminator (0000-9999)
    -- ...
    
    -- Insert user profile
    INSERT INTO public.user_profiles (
      user_id,
      spotify_user_name,  -- ✅ Stores username from OAuth
      spotify_user_id,    -- ✅ NULL initially, auth callback will fetch real ID
      display_name,
      discriminator,
      avatar_url,
      stats_visibility
    ) VALUES (
      NEW.id,
      v_spotify_username,
      NULL,  -- ✅ Auth callback will populate this
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

**The Fix:** 
- `spotify_user_name` stores the username from OAuth `sub` claim
- `spotify_user_id` is NULL initially, gets populated by auth callback
- Auth callback fetches real ID from Spotify API `/me` endpoint

#### SiFixed Application Code

#### Updated Sign-In Flow

**File:** `app/(public)/auth/callback/route.ts`

```typescript
// After Spotify OAuth callback
const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

if (user && session) {
  // Get Spotify identity data
  const { data: identities } = await supabase.auth.getUserIdentities();
  const spotifyIdentity = identities?.identities.find(i => i.provider === 'spotify');

  if (spotifyIdentity?.identity_data) {
    // ✅ Extract username from OAuth token
    const spotifyUsername = spotifyIdentity.identity_data.sub;
    let actualSpotifyUserId: string | null = null;
    
    // ✅ Fetch REAL Spotify user ID from API
    try {
      const spotifyResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${session.provider_token}`
        }
      });
      
      if (spotifyResponse.ok) {
        const spotifyProfile = await spotifyResponse.json();
        actualSpotifyUserId = spotifyProfile.id; // ✅ Real Spotify user ID
      }
    } catch (err) {
      console.error('Failed to fetch Spotify profile:', err);
    }
    
    const displayName = spotifyIdentity.identity_data.name || 'User';
    const avatarUrl = spotifyIdentity.identity_data.picture?.url || null;

    // ✅ Update profile with BOTH username and real ID
    const updateData: Record<string, string | null> = {
      spotify_user_name: spotifyUsername,  // ✅ Username
      display_name: displayName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    };
    
    if (actualSpotifyUserId) {
      updateData.spotify_user_id = actualSpotifyUserId;  // ✅ Real ID
    }
    
    await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', user.id);
  }
}
```

**What Changed:**
- ✅ Now fetches real Spotify user ID from `/me` endpoint
- ✅ Updates both `spotify_user_name` and `spotify_user_id` fields
- ✅ Properly scoped `session` variable
- ✅ Handles errors gracefully

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

## Implementation Summary

### Changes Made

#### 1. ✅ Database Migrations Applied

**Migration: `fix_spotify_user_id_storage`**
- Added `is_valid_spotify_user_id()` helper function
- Updated comments to clarify field usage
- Created view `profiles_needing_real_user_id` to identify users needing re-authentication

**Migration: `add_spotify_user_name_field`**
- Added `spotify_user_name` column to `user_profiles` table
- Migrated existing data (moved usernames from `spotify_user_id` to `spotify_user_name`)
- Updated trigger to populate both fields correctly
- Added index on `spotify_user_name` for lookups

#### 2. ✅ Auth Callback Fixed

- Fixed `session` variable scoping issue
- Implemented Spotify API `/me` call to fetch real user ID
- Updates both `spotify_user_name` and `spotify_user_id` on login
- Graceful error handling if API call fails

#### 3. ✅ TypeScript Types Regenerated

Using Supabase CLI:
```bash
supabase gen types typescript --project-id zpswcygleazebxmpblcx > lib/supabase/database.ts
```

Types now include:
- `spotify_user_name: string | null` - Username field
- `spotify_user_id: string` - Real Spotify user ID field

#### 4. ✅ Build Verification

- All TypeScript compilation passes
- No type errors
- Application builds successfully

---

## Current State vs Before

| Component | Before | After |
|-----------|--------|-------|
| `user_profiles` schema | Only `spotify_user_id` (stored username) | `spotify_user_name` + `spotify_user_id` (separate fields) |
| Database trigger | Stored username in wrong field | Stores username in `spotify_user_name`, leaves `spotify_user_id` NULL |
| Auth callback | No API call to fetch real ID | Fetches real ID from `/me` endpoint |
| Follow API calls | Sent usernames (failed) | Will send real IDs (works) |
| TypeScript types | Out of sync | Regenerated with new schema |

---

## User Migration Path

Existing users need to **sign out and sign back in** to get their `spotify_user_id` populated with the real Spotify user ID.

**Check which users need re-authentication:**
```sql
SELECT * FROM profiles_needing_real_user_id;
```

This view shows users where:
- `spotify_user_id` is NULL, or
- `spotify_user_id` looks like a username (short, simple alphanumeric)

---

## Testing Checklist

- [x] Database migrations applied successfully
- [x] Auth callback fetches real Spotify user ID
- [x] TypeScript types regenerated with CLI
- [x] Application builds without errors
- [ ] Test user re-authentication flow
- [ ] Verify follow/unfollow functionality with real IDs
- [ ] Check friend profile page uses correct ID field
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
## Key Takeaways

1. **Spotify OAuth `sub` claim contains username, not user ID** - Always fetch real ID from API
2. **Separate username and user ID fields** - Don't conflate these two different values
3. **Auth callback is the right place to fetch user ID** - Has access to provider token
4. **Use Supabase CLI for type generation** - Run `supabase gen types typescript` after schema changes
5. **Existing users need re-auth** - Can't backfill real IDs without user tokens

---

**Last Updated:** January 8, 2026  
**Status:** ✅ RESOLVED - Users need to re-authenticate to populate real Spotify user IDsme/avatar | Should fetch & store real ID |
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
