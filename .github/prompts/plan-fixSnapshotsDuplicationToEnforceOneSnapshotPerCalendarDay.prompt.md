# Plan: Fix Snapshot Duplication to Enforce One Snapshot Per Calendar Day

## Executive Summary

**Problem**: Users see duplicate dates on ranking history charts due to multiple snapshots being created on the same calendar day at different times.

**Impact**: Confusing visualizations, data redundancy, wasted database storage, incorrect ranking history analysis.

**Solution**: Replace timestamp-based unique constraint with date-based constraint, fix API route logic to check by calendar day per time_range, and clean up existing duplicates.

**Risk Level**: Low (current data is clean, changes are backwards-compatible)

**Estimated Implementation Time**: 30-45 minutes

---

## Problem Analysis

### User-Visible Issue

The ranking history charts display duplicate dates on the x-axis:
- **Current behavior**: "8 jan, 9 jan, 9 jan, 9 jan, 10 jan"
- **Expected behavior**: "8 jan, 9 jan, 10 jan, 11 jan"

This occurs because multiple snapshots are created for the same user/time_range/calendar_day combination at different times throughout the day.

### Database-Level Issue

The unique constraint `UNIQUE (user_id, created_at, time_range)` uses the **exact timestamp** instead of the **calendar date**:
- Allows: User A, medium_term, 2026-01-09 08:00:00 ✅
- Allows: User A, medium_term, 2026-01-09 14:30:00 ✅ (SHOULD BLOCK!)
- Blocks: User A, medium_term, 2026-01-09 14:30:00 (exact duplicate) ❌

### Application-Level Issues

Multiple logic problems in [app/api/snapshot/route.ts](app/api/snapshot/route.ts):

1. **24-hour rolling window instead of calendar day**:
   ```typescript
   const timeSinceLastSnapshot = now - lastSnapshotTime;
   if (timeSinceLastSnapshot < 24 * 60 * 60 * 1000) { // Rolling 24h
     return "skipped"; // Wrong! Should check calendar day
   }
   ```

2. **Checks across ALL time ranges** instead of per time_range:
   ```typescript
   .eq("user_id", user.id)
   // Missing: .eq("time_range", timeRange)
   ```
   If short_term has a snapshot from 23 hours ago, it skips medium_term and long_term too!

3. **Race condition window**: API route and edge function can both check "no snapshot exists today" simultaneously and both create snapshots

## Root Causes

### 1. Database Constraint is Timestamp-Based

**Current constraint**:
```sql
UNIQUE (user_id, created_at, time_range)
```

**Problem**: `created_at` is `timestamptz`, so `2026-01-09 08:00:00` and `2026-01-09 14:30:00` are different values.

**Should be**:
```sql
UNIQUE (user_id, time_range, DATE(created_at))
```

### 2. API Route Uses Rolling 24-Hour Window

**File**: [app/api/snapshot/route.ts](app/api/snapshot/route.ts#L300-L321)

**Current logic**:
- Checks if ANY snapshot exists within last 24 hours
- Uses millisecond arithmetic: `now - lastSnapshotTime < 24h`
- Doesn't care about calendar day boundaries

**Example failure scenario**:
1. Snapshot created: 2026-01-08 23:00:00
2. User visits dashboard: 2026-01-09 08:00:00 (9 hours later)
3. Check passes: `9 hours < 24 hours` ✅
4. Skips snapshot for 2026-01-09 ❌
5. User's "today" data never gets collected!

### 3. API Route Doesn't Check Per Time Range

**Current behavior**:
```typescript
const { data: lastSnapshot } = await supabase
  .from("snapshots")
  .select("created_at")
  .eq("user_id", user.id)
  // Missing: .eq("time_range", timeRange)
  .order("created_at", { ascending: false })
  .limit(1)
  .single();
```

**Example failure scenario**:
1. short_term snapshot exists from 23 hours ago
2. User visits dashboard (triggers snapshot collection)
3. API checks: "User has a snapshot from 23 hours ago" → skip
4. medium_term and long_term never get collected today!

### 4. Race Conditions Possible

**Scenario**:
1. 05:59:59 UTC - User visits dashboard
2. API route checks: "No snapshot today" ✅
3. API route starts creating snapshots (takes ~2 seconds)
4. 06:00:00 UTC - Edge function cron triggers
5. Edge function checks: "No snapshot today" ✅ (API hasn't finished yet)
6. Both create snapshots!
7. Result: 6 snapshots instead of 3

**Current protection**: None at database level (constraint only checks timestamp, not date)

---

## Solution Overview

### Core Strategy

1. **Database Layer**: Replace timestamp-based constraint with date-based unique index
2. **Application Layer**: Fix API route to check by calendar day per time_range
3. **Data Cleanup**: Remove existing duplicates (keep newest)
4. **Type Safety**: Regenerate database types to reflect new constraint

### Why This Approach?

**Alternatives Considered**:

1. ❌ **Keep timestamp constraint, fix app logic only**
   - Doesn't prevent race conditions
   - No database-level enforcement
   - Still allows duplicates if app logic has bugs

2. ❌ **Use upsert instead of insert**
   - Requires deleting old rankings first (complex)
   - Loses history if previous_rank calculations fail
   - Harder to reason about transaction safety

3. ✅ **Date-based constraint + proper app checks** (CHOSEN)
   - Database enforces correctness
   - App logic is defensive
   - Prevents all duplicate scenarios
   - Backwards compatible (no data loss)

### Implementation Phases

**Phase 1: Database Migration** (5 min)
- Drop old constraint
- Clean duplicates
- Add new date-based index

**Phase 2: API Route Fix** (15 min)
- Replace 24h check with same-day check
- Add per-time_range logic
- Handle partial snapshots gracefully

**Phase 3: Type Generation** (5 min)
- Run Supabase CLI to regenerate types
- Verify constraint appears in schema

**Phase 4: Testing** (15 min)
- Manual testing across time zones
- Edge case verification
- Performance check

---

## Implementation Details

### Step 1: Create Migration to Replace Constraint

**File**: `supabase/migrations/XXX_enforce_one_snapshot_per_day.sql`

**Actions**:
1. Drop existing `snapshots_user_id_created_at_time_range_key` constraint
2. Create new date-based unique index: `CREATE UNIQUE INDEX snapshots_user_date_timerange_unique ON snapshots (user_id, time_range, DATE(created_at))`
3. Cleanup existing duplicates (keep newest snapshot per user/time_range/date)

**SQL**:
```sql
-- ============================================================================
-- Migration: Enforce One Snapshot Per Calendar Day
-- ============================================================================
-- 
-- Problem: Current constraint allows multiple snapshots on the same calendar day
--          because it uses exact timestamp instead of date
-- 
-- Solution: Replace timestamp-based constraint with date-based unique index
-- 
-- Impact: Prevents duplicate snapshots, cleans up existing duplicates
-- 
-- Risk: Low - current data is clean, expression index is well-supported
-- 
-- ============================================================================

-- Step 1: Remove existing timestamp-based constraint
-- This constraint allowed same-day duplicates at different times
ALTER TABLE snapshots DROP CONSTRAINT IF EXISTS snapshots_user_id_created_at_time_range_key;

-- Step 2: Cleanup existing duplicates (keep newest per user/time_range/date)
-- Uses window function to identify duplicates and delete older ones
DELETE FROM snapshots
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, time_range, DATE(created_at)
        ORDER BY created_at DESC  -- Keep NEWEST (most recent data)
      ) as rn
    FROM snapshots
  ) ranked
  WHERE rn > 1  -- Delete all but the newest snapshot per day
);

-- Step 3: Add new date-based unique index (expression index)
-- This enforces one snapshot per user per time_range per UTC calendar day
CREATE UNIQUE INDEX snapshots_user_date_timerange_unique 
ON snapshots (user_id, time_range, DATE(created_at));

-- Step 4: Add documentation comment
COMMENT ON INDEX snapshots_user_date_timerange_unique IS 
  'Ensures only one snapshot per user per time_range per calendar day (UTC). Prevents duplicate ranking history data.';

-- Step 5: Verify cleanup worked (should return 0 rows)
DO $$ 
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT user_id, time_range, DATE(created_at), COUNT(*) as cnt
    FROM snapshots
    GROUP BY user_id, time_range, DATE(created_at)
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Duplicate snapshots still exist after cleanup! Count: %', duplicate_count;
  END IF;
  
  RAISE NOTICE 'Migration successful - no duplicates found';
END $$;
```

**Migration Metadata**:
- **File**: `supabase/migrations/XXX_enforce_one_snapshot_per_day.sql`
- **Apply via**: `mcp_supabase_apply_migration` tool
- **Estimated duration**: < 1 second (assuming < 10,000 snapshots)
- **Rollback available**: Yes (see Rollback Plan section)

**PostgreSQL Expression Index Notes**:
- Expression indexes like `DATE(created_at)` are fully supported in PostgreSQL 9.0+
- Index is calculated once when row is inserted, then cached
- Performance impact: Negligible (DATE calculation is fast)
- Index size: ~20 bytes per snapshot row (minimal)

### Step 2: Fix API Route Date Checking Logic

**File**: [app/api/snapshot/route.ts](app/api/snapshot/route.ts)

#### Current Implementation (BROKEN)

**Lines ~300-321**:
```typescript
// Check if snapshot is needed (across all time ranges)
const { data: lastSnapshot } = await supabase
  .from("snapshots")
  .select("created_at")
  .eq("user_id", user.id)  // ❌ Not filtering by time_range
  .order("created_at", { ascending: false })
  .limit(1)
  .single();

if (lastSnapshot) {
  const lastSnapshotTime = new Date(lastSnapshot.created_at).getTime();
  const now = Date.now();
  const timeSinceLastSnapshot = now - lastSnapshotTime;
  
  // ❌ Uses 24-hour rolling window instead of calendar day
  if (timeSinceLastSnapshot < SNAPSHOT_INTERVAL_MS) {
    return NextResponse.json({
      success: true,
      skipped: true,
      message: "Snapshot is up to date",
      lastSnapshot: lastSnapshot.created_at
    }, { status: 200 });
  }
}
```

**Problems**:
1. ❌ Checks if **ANY** snapshot exists (doesn't filter by time_range)
2. ❌ Uses 24-hour rolling window (not calendar day)
3. ❌ Skips **ALL** time ranges if one is recent
4. ❌ Doesn't handle partial snapshots (some time ranges collected, others not)

#### New Implementation (FIXED)

**Replace the entire check block with**:

```typescript
// ============================================================================
// Check which time ranges already have snapshots TODAY
// ============================================================================
// Uses UTC calendar day to match database constraint and edge function logic
// Allows partial collection (e.g., if only short_term exists, collect others)
const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format (UTC)
const { data: todaySnapshots } = await supabase
  .from("snapshots")
  .select("time_range, created_at")
  .eq("user_id", user.id)
  .gte("created_at", `${today}T00:00:00Z`)
  .lte("created_at", `${today}T23:59:59Z`);

console.log(`[Snapshot] Today is ${today}, found ${todaySnapshots?.length || 0} existing snapshots`);

// If all time ranges already collected today, skip entirely
if (todaySnapshots && todaySnapshots.length === TIME_RANGES.length) {
  console.log(`[Snapshot] All ${TIME_RANGES.length} time ranges already collected today - skipping`);
  return NextResponse.json({
    success: true,
    skipped: true,
    message: "All snapshots already collected today",
    date: today,
    timeRanges: todaySnapshots.map(s => s.time_range),
    timestamps: todaySnapshots.map(s => s.created_at)
  }, { status: 200 });
}

// Determine which time ranges still need collection
const existingTimeRanges = new Set(todaySnapshots?.map(s => s.time_range) || []);
const timeRangesToProcess = TIME_RANGES.filter(tr => !existingTimeRanges.has(tr));

console.log(`[Snapshot] Need to process: ${timeRangesToProcess.join(", ")}`);
console.log(`[Snapshot] Already have: ${Array.from(existingTimeRanges).join(", ") || "none"}`);
```

#### Update Snapshot Processing Loop

**Find this section** (around line 335):
```typescript
// Fetch current top items from Spotify for ALL time ranges
const fetchStartTime = Date.now();
const spotifyData = await Promise.all(
  TIME_RANGES.map(async (timeRange) => {
    // ... fetch logic
  })
);
```

**Replace `TIME_RANGES` with `timeRangesToProcess`**:
```typescript
// Fetch current top items from Spotify for NEEDED time ranges only
const fetchStartTime = Date.now();
const spotifyData = await Promise.all(
  timeRangesToProcess.map(async (timeRange) => {  // ✅ Only process needed ranges
    const [artists, tracks] = await Promise.all([
      getTopArtists(timeRange, 50),
      getTopTracks(timeRange, 50),
    ]);
    const albums = extractAlbumsFromTracks(tracks);
    return { timeRange, artists, tracks, albums };
  })
);
console.log(`[Snapshot] Fetched Spotify data for ${timeRangesToProcess.length} time ranges in ${Date.now() - fetchStartTime}ms`);
```

#### Update Response Message

**Find final response** (around line 380):
```typescript
return NextResponse.json(
  { 
    success: successCount > 0,
    message: successCount === TIME_RANGES.length 
      ? "All snapshots collected successfully" 
      : `Collected ${successCount}/${TIME_RANGES.length} snapshots`,
    processed: TIME_RANGES.length,
    succeeded: successCount,
    results
  },
  { status: 200 }
);
```

**Update to reflect actual processing**:
```typescript
return NextResponse.json(
  { 
    success: successCount > 0,
    message: successCount === timeRangesToProcess.length
      ? `Collected ${successCount} new snapshot(s) successfully`
      : `Collected ${successCount}/${timeRangesToProcess.length} snapshots (${existingTimeRanges.size} already existed)`,
    date: today,
    newSnapshots: timeRangesToProcess.length,
    existingSnapshots: existingTimeRanges.size,
    totalTimeRanges: TIME_RANGES.length,
    processed: timeRangesToProcess.length,
    succeeded: successCount,
    results
  },
  { status: 200 }
);
```

**Benefits of New Implementation**:
- ✅ Checks by UTC calendar day (matches database constraint)
- ✅ Handles partial snapshots gracefully
- ✅ Only fetches from Spotify what's needed (saves API calls)
- ✅ Better logging for debugging
- ✅ More informative response messages

### Step 3: Verify Edge Function Logic

**File**: [supabase/functions/collect-snapshots/index.ts](supabase/functions/collect-snapshots/index.ts)

#### Current Implementation (ALREADY CORRECT ✅)

**Lines 319-337** in `processUserSnapshot` function:
```typescript
// Check for existing snapshot today (idempotency)
const today = new Date().toISOString().split("T")[0];
const { data: existingSnapshot } = await supabase
  .from("snapshots")
  .select("id")
  .eq("user_id", userId)
  .eq("time_range", timeRange)  // ✅ Correctly filters by time_range
  .gte("created_at", `${today}T00:00:00Z`)
  .lte("created_at", `${today}T23:59:59Z`)
  .single();

if (existingSnapshot) {
  console.log(
    `Snapshot already exists for user ${userId}, time_range ${timeRange} today - skipping`
  );
  return;
}
```

**Analysis**:
- ✅ Checks by UTC calendar day (not 24-hour rolling window)
- ✅ Filters by specific time_range (checks each independently)
- ✅ Uses same date logic as new API route implementation
- ✅ Logs clearly when skipping

#### Edge Function Timing Analysis

**Current Schedule**: 6 AM UTC daily (defined in cron job)

**Collision Risk Analysis**:

| User Timezone | Local Time at 6 AM UTC | Likelihood of Manual Trigger |
|---------------|------------------------|------------------------------|
| UTC-8 (PST) | 10 PM previous day | Low (evening) |
| UTC-5 (EST) | 1 AM | Very Low (sleeping) |
| UTC+0 (GMT) | 6 AM | Low (just waking up) |
| UTC+1 (CET) | 7 AM | Medium (morning routine) |
| UTC+8 (CST) | 2 PM | Medium (afternoon) |
| UTC+9 (JST) | 3 PM | Medium (afternoon) |

**Verdict**: 6 AM UTC is reasonable (off-peak for most US/EU users, midday for APAC)

**Database Constraint Protection**:
- Even if API route and edge function both try to create snapshot at same time
- Database will reject one with unique constraint violation
- Race condition is now **impossible** at database level

#### Recommendations

**No changes needed**, but consider:

1. **Optional: Add retry logic for constraint violations**
   ```typescript
   try {
     await supabase.from("snapshots").insert({ ... });
   } catch (error) {
     if (error.code === "23505") { // Unique violation
       console.log("Snapshot already exists (race condition) - skipping");
       return;
     }
     throw error;
   }
   ```

2. **Optional: Change cron time to 5 AM UTC** if collision metrics show issues
   - Would move window even earlier for US/EU users
   - Current timing is acceptable

**Action**: No changes required for this step

### Step 4: Update Database Types

**After migration is applied**, run in terminal:
```bash
supabase gen types typescript --project-id <project-id> > lib/supabase/database.ts
```

**Verify**: New index appears in generated types (constraint metadata)

## Expected Outcomes

1. ✅ **Database enforces one snapshot per user/time_range/calendar day**
2. ✅ **API route skips already-collected time ranges instead of all-or-nothing**
3. ✅ **Ranking history charts show unique dates** (no more "9 jan, 9 jan, 9 jan")
4. ✅ **Existing duplicates cleaned up** (keeping newest snapshot)
5. ✅ **Race conditions prevented** at database level (unique index)

## Testing Checklist

- [ ] Apply migration successfully
- [ ] Verify no duplicates remain in database
- [ ] Trigger manual snapshot via dashboard - should skip if already collected today
- [ ] Trigger manual snapshot again immediately - should return "skipped" response
- [ ] Wait until next UTC day - snapshot should succeed
- [ ] Check ranking history chart - verify no duplicate dates on x-axis
- [ ] Verify edge function logs (next 6 AM UTC run) - should skip existing snapshots
- [ ] Check for any constraint violation errors in logs

## Rollback Plan

If issues arise:
```sql
-- Drop new constraint
DROP INDEX IF EXISTS snapshots_user_date_timerange_unique;

-- Restore old constraint (timestamp-based)
ALTER TABLE snapshots 
ADD CONSTRAINT snapshots_user_id_created_at_time_range_key 
UNIQUE (user_id, created_at, time_range);
```

## Decisions Made

- ✅ **Cleanup strategy**: Keep **newest** snapshot when duplicates exist
- ✅ **Edge function timing**: Keep 6 AM UTC (off-peak, minimizes collisions)
- ✅ **Rollback safety**: Replace constraint immediately (current data is clean)
