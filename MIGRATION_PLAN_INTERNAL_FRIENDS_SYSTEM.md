# Migration Plan: Internal Friends System

## Why This Change?

Spotify's User Follow API has critical limitations:
- **Legacy accounts** (short usernames like "ludwig100") work with follow/unfollow but fail on status checks
- **Inconsistent IDs**: Some accounts use short usernames, others use 22+ char IDs
- **API unreliability**: `/me/following` endpoints return 400 errors for legacy accounts
- **No control**: We're entirely dependent on Spotify's social graph

**Solution**: Build our own friends system using internal user relationships.

---

## Database Changes Required

### New Tables to Create

#### `friendships`
```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Prevent self-friending
ALTER TABLE friendships ADD CONSTRAINT no_self_friend 
  CHECK (user_id != friend_id);

-- Index for lookups
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);
```

### Tables to Modify

#### `user_profiles` (minimal changes)
- **Keep** `spotify_user_id` - still needed for Spotify data fetching
- **Keep** `display_name` and `discriminator` - our user identification system
- **Remove dependency** on `spotify_user_id` for social features

#### `follow_cache` (deprecate/remove)
- **Action**: Drop this table entirely
- **Reason**: No longer checking Spotify follow status
- **Impact**: All friend-related features will use `friendships` table

---

## Feature Changes

### Current Flow (Spotify-dependent)
1. User views friend's profile
2. Check Spotify follow status via API
3. Show Follow/Unfollow button
4. API call to Spotify when clicked
5. Cache result in `follow_cache`

### New Flow (Internal system)
1. User views friend's profile  
2. Check `friendships` table for relationship
3. Show Add Friend/Accept/Remove button based on status
4. Update `friendships` table when clicked
5. No external API dependency

### Stats Visibility Logic
**Old**: `stats_visibility = 'followers'` checked Spotify mutual follows
**New**: `stats_visibility = 'followers'` checks internal friendships

```sql
-- Old query (Spotify-based)
SELECT * FROM user_profiles 
WHERE stats_visibility = 'public' 
   OR (stats_visibility = 'followers' AND spotify_mutual_follow)

-- New query (Internal)
SELECT * FROM user_profiles 
WHERE stats_visibility = 'public'
   OR (stats_visibility = 'followers' AND EXISTS (
     SELECT 1 FROM friendships 
     WHERE (user_id = current_user AND friend_id = profile.user_id 
            OR user_id = profile.user_id AND friend_id = current_user)
     AND status = 'accepted'
   ))
```

---

## Implementation Steps

1. **Create `friendships` table** with RLS policies
2. **Update friend profile page** to use internal friendships
3. **Replace follow button** with friend request system
4. **Update stats visibility checks** to query friendships
5. **Create friend management UI** (accept/reject requests)
6. **Drop `follow_cache` table** after migration complete
7. **Remove Spotify follow API calls** from codebase

---

## Benefits

✅ **Reliability**: No dependency on Spotify API quirks  
✅ **Control**: Full ownership of social graph  
✅ **Consistency**: Works for all users regardless of Spotify account type  
✅ **Features**: Can add friend requests, blocking, friend lists  
✅ **Performance**: No external API calls for friend checks  

---

## Timeline

- Phase 1: Create new tables and APIs (1-2 hours)
- Phase 2: Update UI components (1 hour)  
- Phase 3: Test and verify (30 min)
- Phase 4: Drop old system (15 min)

**Total estimated time**: 3-4 hours
