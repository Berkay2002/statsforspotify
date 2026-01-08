## Plan: Internal Friends System Database Migration

### Overview

**Goal**: Replace Spotify's unreliable follow API with an internal `friendships` table that provides full control over the social graph.

**Why**: Spotify's User Follow API fails for legacy accounts (short usernames like "ludwig100"), returns inconsistent 400 errors, and leaves us dependent on external API reliability.

**Approach**: Single SQL migration (`008_create_friendships_table.sql`) executed via Supabase Dashboard SQL Editor.

---

### Database Schema Design

#### New Table: `friendships`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| `user_id` | UUID | NOT NULL, FK → auth.users ON DELETE CASCADE | User who initiated the friendship/request |
| `friend_id` | UUID | NOT NULL, FK → auth.users ON DELETE CASCADE | Target user of the friendship/request |
| `status` | TEXT | NOT NULL, CHECK IN ('pending', 'accepted', 'blocked') | Current state of the relationship |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When the request was created |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

**Constraints**:
- `UNIQUE(user_id, friend_id)` — Prevents duplicate friendship rows
- `CHECK(user_id != friend_id)` — Prevents self-friending

**Indexes**:
- `idx_friendships_user_id` — Fast lookup of friendships initiated by user
- `idx_friendships_friend_id` — Fast lookup of friendships targeting user
- `idx_friendships_status` — Filter by pending/accepted/blocked

#### Friendship Model: Single-Row Bidirectional

When User A sends a friend request to User B:
- Creates row: `(user_id: A, friend_id: B, status: 'pending')`
- User B accepts → status changes to `'accepted'`
- Either user can query friendships where they are `user_id` OR `friend_id`

**Query pattern for checking friendship**:
```sql
SELECT * FROM friendships 
WHERE status = 'accepted' 
  AND ((user_id = :user_a AND friend_id = :user_b) 
    OR (user_id = :user_b AND friend_id = :user_a))
```

---

### Step 1: Create `set_updated_at()` Trigger Function

Reusable trigger function for auto-updating `updated_at` timestamps on any table.

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### Step 2: Create `friendships` Table

```sql
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT friendships_unique UNIQUE(user_id, friend_id),
  CONSTRAINT friendships_no_self_friend CHECK (user_id != friend_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);

-- Composite index for common query pattern
CREATE INDEX idx_friendships_user_status ON public.friendships(user_id, status);
CREATE INDEX idx_friendships_friend_status ON public.friendships(friend_id, status);
```

---

### Step 3: Create `updated_at` Trigger on `friendships`

```sql
DROP TRIGGER IF EXISTS set_friendships_updated_at ON public.friendships;
CREATE TRIGGER set_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
```

---

### Step 4: Enable RLS and Create Policies on `friendships`

```sql
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see friendships where they are involved
CREATE POLICY "Users can view their own friendships"
  ON public.friendships
  FOR SELECT
  USING (auth.uid() IN (user_id, friend_id));

-- INSERT: Users can only create friendship requests as the initiator
CREATE POLICY "Users can send friend requests"
  ON public.friendships
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Only the recipient can accept/reject, or either party can update status
CREATE POLICY "Users can update friendship status"
  ON public.friendships
  FOR UPDATE
  USING (auth.uid() IN (user_id, friend_id))
  WITH CHECK (
    -- Recipient can accept/reject pending requests
    (auth.uid() = friend_id AND status IN ('accepted', 'blocked'))
    OR
    -- Either party can block
    (auth.uid() IN (user_id, friend_id) AND status = 'blocked')
  );

-- DELETE: Either party can remove a friendship
CREATE POLICY "Users can remove friendships"
  ON public.friendships
  FOR DELETE
  USING (auth.uid() IN (user_id, friend_id));
```

---

### Step 5: Create `check_friendship_status()` Function

Replaces `check_mutual_follow_cached()` for RLS policies on ranking tables.

```sql
CREATE OR REPLACE FUNCTION check_friendship_status(
  p_user_id_1 UUID,
  p_user_id_2 UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Check if an accepted friendship exists between two users (either direction)
  RETURN EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (user_id = p_user_id_1 AND friend_id = p_user_id_2)
        OR 
        (user_id = p_user_id_2 AND friend_id = p_user_id_1)
      )
  );
END;
$$;
```

---

### Step 6: Update RLS Policies on Ranking Tables

Drop existing policies that use `check_mutual_follow_cached()` and recreate with `check_friendship_status()`.

#### 6a. `artist_rankings` Table

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Users can view friends' artist rankings" ON public.artist_rankings;

-- Create new policy using internal friendships
CREATE POLICY "Users can view friends' artist rankings"
  ON public.artist_rankings
  FOR SELECT
  USING (
    -- User can always see their own data
    auth.uid() = user_id 
    OR
    -- Check visibility settings
    (
      -- Public visibility: anyone can view
      EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.user_id = artist_rankings.user_id
        AND up.stats_visibility = 'public'
      )
      OR
      -- Followers visibility: only accepted friends
      (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.user_id = artist_rankings.user_id
          AND up.stats_visibility = 'followers'
        )
        AND check_friendship_status(auth.uid(), artist_rankings.user_id)
      )
    )
  );
```

#### 6b. `track_rankings` Table

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Users can view friends' track rankings" ON public.track_rankings;

-- Create new policy using internal friendships
CREATE POLICY "Users can view friends' track rankings"
  ON public.track_rankings
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR
    (
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
        AND check_friendship_status(auth.uid(), track_rankings.user_id)
      )
    )
  );
```

#### 6c. `album_rankings` Table

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Users can view friends' album rankings" ON public.album_rankings;

-- Create new policy using internal friendships
CREATE POLICY "Users can view friends' album rankings"
  ON public.album_rankings
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR
    (
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
        AND check_friendship_status(auth.uid(), album_rankings.user_id)
      )
    )
  );
```

---

### Step 7: Drop Deprecated Objects

```sql
-- Drop the old function (no longer needed)
DROP FUNCTION IF EXISTS check_mutual_follow_cached(UUID, UUID);

-- Drop the follow_cache table (empty, never worked)
DROP TABLE IF EXISTS public.follow_cache;
```

---

### Step 8: Regenerate Database Types

After executing the migration in Supabase Dashboard, run in terminal:

```bash
supabase gen types typescript --project-id <project-id> > lib/supabase/database.ts
```

---

### Verification Checklist

After running the migration, verify:

- [ ] `friendships` table exists with correct schema
- [ ] RLS is enabled on `friendships` table
- [ ] All 4 policies exist on `friendships` (SELECT, INSERT, UPDATE, DELETE)
- [ ] `check_friendship_status()` function exists and returns correct results
- [ ] Ranking table policies updated (test with two users)
- [ ] `follow_cache` table is dropped
- [ ] `check_mutual_follow_cached()` function is dropped
- [ ] TypeScript types regenerated and include `friendships` table

---

### Rollback Plan

If issues occur, rollback in reverse order:

```sql
-- 1. Restore old function (copy from backup before migration)
-- 2. Restore old RLS policies on ranking tables
-- 3. Drop friendships table
-- 4. Recreate follow_cache table (optional, was empty)
```

---

### Post-Migration: Code Changes Required

After database migration, update application code:

#### API Routes to Modify
| Route | Change |
|-------|--------|
| `/api/friends/check-follow` | Query `friendships` table instead of Spotify API |
| `/api/friends/follow` | Replace with `POST /api/friends/request` - creates pending friendship |
| `/api/friends/unfollow` | Replace with `DELETE /api/friends/[id]` - removes friendship |
| `/api/friends/sync` | Remove entirely (no longer syncing with Spotify) |

#### New API Routes to Create
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/friends/request` | POST | Send friend request (creates pending friendship) |
| `/api/friends/accept` | POST | Accept pending request (updates status to accepted) |
| `/api/friends/reject` | POST | Reject pending request (deletes row) |
| `/api/friends/pending` | GET | List incoming pending requests |
| `/api/friends/list` | GET | List accepted friends |

#### UI Components to Update
| Component | Change |
|-----------|--------|
| `friend-follow-button.tsx` | Replace "Follow on Spotify" with "Add Friend" / "Pending" / "Friends" states |
| `dashboard/friends/page.tsx` | Add pending requests section, remove Spotify sync |
| `dashboard/friends/[username]/[discriminator]/page.tsx` | Update friendship status display |

---

### Timeline Estimate

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Execute SQL migration | 15 min |
| 2 | Regenerate types & verify | 10 min |
| 3 | Update API routes | 1-2 hours |
| 4 | Update UI components | 1 hour |
| 5 | Testing & verification | 30 min |
| **Total** | | **3-4 hours**
