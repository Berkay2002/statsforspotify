# Plan: Upgrade Snapshot API Route to Match Edge Function Reliability

Bring the edge function's robust practices to the API route, then sync improvements back: add transaction rollback, compute previous_rank for instant rank change display, process all time ranges, invalidate caches automatically, and add color-coded rank change badges throughout the UI.

## Steps

1. **Add database schema** - Create migration [20260110_add_previous_rank_columns.sql](supabase/migrations/20260110_add_previous_rank_columns.sql) adding `previous_rank INTEGER` columns to `artist_rankings`, `track_rankings`, `album_rankings` tables with optional indexes and documentation comments

2. **Implement rollback in API route** - Wrap [snapshot/route.ts](app/api/snapshot/route.ts) lines 60-137 in `createSnapshotWithRollback()` function with try/catch that deletes `snapshots` record on any ranking insert failure, ensuring atomic all-or-nothing per time range

3. **Calculate previous_rank in API route** - Add `calculatePreviousRanks()` helper that queries previous snapshot for same `time_range`, creates lookup Maps by item ID, assigns `previous_rank` to each ranking (NULL if new entry), add timing logs to measure overhead

4. **Process all time ranges in API route** - Update [snapshot/route.ts](app/api/snapshot/route.ts) to loop through `["short_term", "medium_term", "long_term"]` with 500ms delays, keep 24-hour rate limit, continue processing remaining ranges if one fails, return simple success boolean

5. **Sync edge function with previous_rank** - Add identical `calculatePreviousRanks()` logic to [collect-snapshots/index.ts](supabase/functions/collect-snapshots/index.ts) in `processUserSnapshot()` before inserting rankings (around lines 290-340), include timing logs

6. **Create RankBadgeInline component** - Build [components/charts/rank-badge-inline.tsx](components/charts/rank-badge-inline.tsx) showing color-coded changes: green "↑5" (improved), red "↓3" (declined), blue "NEW" (first appearance), gray "—" (stable)

7. **Add badges to list components** - Update [artists-list.tsx](components/artists-list.tsx), [tracks-list.tsx](components/tracks-list.tsx), [albums-list.tsx](components/albums-list.tsx) to render `RankBadgeInline` when `previous_rank` exists (progressive enhancement)

8. **Enhance ranking charts** - Update [ranking-chart.tsx](components/charts/ranking-chart.tsx) to add colored dots at data points with significant rank changes (±5 positions), update tooltips to show "Rank 3 (was 8, ↑5)" including previous_rank when available

9. **Add success notification** - Update [auto-snapshot-trigger.tsx](components/auto-snapshot-trigger.tsx) to show Sonner toast with auto-hide (3 seconds) after successful snapshot: "Stats updated!" with subtle styling

10. **Invalidate caches on success** - Dispatch `CustomEvent('invalidate-sparklines')` in [auto-snapshot-trigger.tsx](components/auto-snapshot-trigger.tsx) after successful snapshot, add event listener in [combined-sparkline-loader.tsx](components/charts/combined-sparkline-loader.tsx) to clear cache Map and trigger re-fetch

11. **Regenerate types & test** - Apply migration via Supabase Dashboard SQL Editor, run `supabase gen types typescript --project-id <id>` in terminal to update [database.ts](lib/supabase/database.ts), test rollback deletes snapshots on failure, verify previous_rank values populate correctly, check badges display in lists and chart annotations work, review timing logs

12. **Update documentation** - Update [AGENTS.md](AGENTS.md) database types section to document `previous_rank` field usage, update [README.md](README.md) features section to mention rank change visualization with colored badges and enhanced charts

## Implementation Details

### Migration SQL

```sql
-- Migration: 20260110_add_previous_rank_columns.sql

-- Add previous_rank to artist_rankings
ALTER TABLE artist_rankings
ADD COLUMN previous_rank integer;

-- Add previous_rank to track_rankings
ALTER TABLE track_rankings
ADD COLUMN previous_rank integer;

-- Add previous_rank to album_rankings
ALTER TABLE album_rankings
ADD COLUMN previous_rank integer;

-- Add indexes for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_artist_rankings_previous_rank 
  ON artist_rankings(previous_rank) WHERE previous_rank IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_track_rankings_previous_rank 
  ON track_rankings(previous_rank) WHERE previous_rank IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_album_rankings_previous_rank 
  ON album_rankings(previous_rank) WHERE previous_rank IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN artist_rankings.previous_rank IS 'Rank from previous snapshot in same time range (NULL if new entry)';
COMMENT ON COLUMN track_rankings.previous_rank IS 'Rank from previous snapshot in same time range (NULL if new entry)';
COMMENT ON COLUMN album_rankings.previous_rank IS 'Rank from previous snapshot in same time range (NULL if new entry)';
```

### API Route Structure

```typescript
// Helper: Calculate previous ranks
async function calculatePreviousRanks(
  supabase: SupabaseClient,
  userId: string,
  timeRange: TimeRange,
  artists: RankedArtist[],
  tracks: RankedTrack[],
  albums: RankedAlbum[]
): Promise<RankingsWithPrevious> {
  const startTime = Date.now();
  
  // Fetch previous snapshot for this time range
  const { data: previousSnapshot } = await supabase
    .from("snapshots")
    .select("id")
    .eq("user_id", userId)
    .eq("time_range", timeRange)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  
  if (!previousSnapshot) {
    console.log(`[Previous Rank] No previous snapshot for ${timeRange} - first snapshot`);
    return {
      artists: artists.map(a => ({ ...mapArtist(a), previous_rank: null })),
      tracks: tracks.map(t => ({ ...mapTrack(t), previous_rank: null })),
      albums: albums.map(a => ({ ...mapAlbum(a), previous_rank: null })),
    };
  }
  
  // Fetch previous rankings in parallel
  const [prevArtists, prevTracks, prevAlbums] = await Promise.all([
    supabase.from("artist_rankings")
      .select("artist_id, rank")
      .eq("snapshot_id", previousSnapshot.id),
    supabase.from("track_rankings")
      .select("track_id, rank")
      .eq("snapshot_id", previousSnapshot.id),
    supabase.from("album_rankings")
      .select("album_id, rank")
      .eq("snapshot_id", previousSnapshot.id),
  ]);
  
  // Create lookup maps
  const artistRankMap = new Map(prevArtists.data?.map(r => [r.artist_id, r.rank]));
  const trackRankMap = new Map(prevTracks.data?.map(r => [r.track_id, r.rank]));
  const albumRankMap = new Map(prevAlbums.data?.map(r => [r.album_id, r.rank]));
  
  console.log(`[Previous Rank] Calculated in ${Date.now() - startTime}ms for ${timeRange}`);
  
  return {
    artists: artists.map(a => ({
      ...mapArtist(a),
      previous_rank: artistRankMap.get(a.id) || null,
    })),
    tracks: tracks.map(t => ({
      ...mapTrack(t),
      previous_rank: trackRankMap.get(t.id) || null,
    })),
    albums: albums.map(a => ({
      ...mapAlbum(a),
      previous_rank: albumRankMap.get(a.id) || null,
    })),
  };
}

// Helper: Create snapshot with rollback
async function createSnapshotWithRollback(
  supabase: SupabaseClient,
  userId: string,
  timeRange: TimeRange,
  artists: RankedArtist[],
  tracks: RankedTrack[],
  albums: RankedAlbum[]
): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
  let snapshotId: string | null = null;
  
  try {
    // Create snapshot
    const { data: snapshot, error } = await supabase
      .from("snapshots")
      .insert({ user_id: userId, time_range: timeRange })
      .select()
      .single();
    
    if (error || !snapshot) {
      throw new Error(`Snapshot creation failed: ${error?.message}`);
    }
    
    snapshotId = snapshot.id;
    
    // Calculate previous_rank
    const rankingsWithPrevious = await calculatePreviousRanks(
      supabase, userId, timeRange, artists, tracks, albums
    );
    
    // Insert all rankings
    const results = await Promise.allSettled([
      supabase.from("artist_rankings").insert(rankingsWithPrevious.artists),
      supabase.from("track_rankings").insert(rankingsWithPrevious.tracks),
      supabase.from("album_rankings").insert(rankingsWithPrevious.albums),
    ]);
    
    // Check for failures
    const failures = results.filter(r => r.status === "rejected");
    if (failures.length > 0) {
      throw new Error(`Failed to insert rankings: ${failures.length} failed`);
    }
    
    console.log(`[Snapshot] Successfully created snapshot ${snapshotId} for ${timeRange}`);
    return { success: true, snapshotId };
    
  } catch (error) {
    // ROLLBACK: Delete snapshot (CASCADE will clean up partial rankings)
    if (snapshotId) {
      const { error: rollbackError } = await supabase
        .from("snapshots")
        .delete()
        .eq("id", snapshotId);
      
      if (rollbackError) {
        console.error(`[Rollback] Failed to delete snapshot ${snapshotId}:`, rollbackError);
      } else {
        console.log(`[Rollback] Successfully deleted snapshot ${snapshotId}`);
      }
    }
    
    return { success: false, error: error.message };
  }
}

// Main handler
const TIME_RANGES: TimeRange[] = ["short_term", "medium_term", "long_term"];
const TIME_RANGE_DELAY_MS = 500;

// Process all time ranges sequentially with delays
let successCount = 0;
for (const timeRange of TIME_RANGES) {
  const result = await createSnapshotWithRollback(
    supabase, user.id, timeRange, 
    artistsData[timeRange], tracksData[timeRange], albumsData[timeRange]
  );
  
  if (result.success) {
    successCount++;
  } else {
    console.error(`Failed to create ${timeRange} snapshot:`, result.error);
    // Continue with other time ranges
  }
  
  // Delay between time ranges (skip after last)
  if (timeRange !== TIME_RANGES[TIME_RANGES.length - 1]) {
    await new Promise(resolve => setTimeout(resolve, TIME_RANGE_DELAY_MS));
  }
}

return NextResponse.json({ 
  success: successCount > 0,
  processed: TIME_RANGES.length,
  succeeded: successCount
});
```

### RankBadgeInline Component

```tsx
// components/charts/rank-badge-inline.tsx
import { cn } from "@/lib/utils";

interface RankBadgeInlineProps {
  currentRank: number;
  previousRank: number | null;
  className?: string;
}

export default function RankBadgeInline({ 
  currentRank, 
  previousRank, 
  className 
}: RankBadgeInlineProps) {
  if (!previousRank) {
    return null;
  }
  
  const change = previousRank - currentRank; // Positive = improved (lower rank number)
  
  if (change === 0) {
    return (
      <span className={cn("text-xs text-muted-foreground ml-2", className)}>
        —
      </span>
    );
  }
  
  const isNew = previousRank > 50;
  
  if (isNew) {
    return (
      <span className={cn("text-xs font-medium text-blue-600 dark:text-blue-400 ml-2", className)}>
        NEW
      </span>
    );
  }
  
  const isImprovement = change > 0;
  const arrow = isImprovement ? "↑" : "↓";
  const colorClass = isImprovement 
    ? "text-green-600 dark:text-green-400" 
    : "text-red-600 dark:text-red-400";
  
  return (
    <span className={cn("text-xs font-medium ml-2", colorClass, className)}>
      {arrow}{Math.abs(change)}
    </span>
  );
}
```

### Cache Invalidation

```typescript
// components/auto-snapshot-trigger.tsx
import { toast } from "sonner";

useEffect(() => {
  if (hasTriggered.current) return;
  hasTriggered.current = true;

  fetch("/api/snapshot", { method: "POST" })
    .then(res => res.json())
    .then(data => {
      if (data.success && !data.skipped) {
        // Invalidate sparkline cache
        window.dispatchEvent(new CustomEvent('invalidate-sparklines'));
        
        // Show success notification
        toast.success("Stats updated!", {
          duration: 3000,
          description: `Updated ${data.succeeded || 'all'} time ranges`,
        });
      }
    })
    .catch(console.error);
}, []);

// components/charts/combined-sparkline-loader.tsx
useEffect(() => {
  const handleInvalidate = () => {
    console.log("[Cache] Invalidating sparkline cache");
    sparklineCache.clear();
    setLoading(true);
    // Re-fetch will happen automatically via useEffect
  };
  
  window.addEventListener('invalidate-sparklines', handleInvalidate);
  return () => window.removeEventListener('invalidate-sparklines', handleInvalidate);
}, []);
```

### Chart Enhancements

```typescript
// components/charts/ranking-chart.tsx
// Add to tooltip
tooltip: {
  content: ({ active, payload }) => {
    if (!active || !payload?.[0]) return null;
    
    const data = payload[0].payload;
    const previousRank = data.previous_rank;
    
    let changeText = '';
    if (previousRank) {
      const change = previousRank - data.rank;
      if (change > 0) {
        changeText = ` (was ${previousRank}, ↑${change})`;
      } else if (change < 0) {
        changeText = ` (was ${previousRank}, ↓${Math.abs(change)})`;
      } else {
        changeText = ` (unchanged)`;
      }
    }
    
    return (
      <div className="bg-background p-2 border rounded shadow-sm">
        <p className="font-medium">Rank {data.rank}{changeText}</p>
        <p className="text-sm text-muted-foreground">
          {new Date(data.date).toLocaleDateString()}
        </p>
      </div>
    );
  }
}

// Add custom dot with color based on rank change
dot: (props) => {
  const { cx, cy, payload } = props;
  if (!payload.previous_rank) return null;
  
  const change = payload.previous_rank - payload.rank;
  const isSignificant = Math.abs(change) >= 5;
  
  if (!isSignificant) return null;
  
  const color = change > 0 ? '#22c55e' : '#ef4444'; // green-600 : red-600
  
  return (
    <circle 
      cx={cx} 
      cy={cy} 
      r={4} 
      fill={color} 
      stroke="#fff" 
      strokeWidth={2}
    />
  );
}
```

## Testing Checklist

- [ ] Migration applied successfully in Supabase Dashboard
- [ ] TypeScript types regenerated with `supabase gen types`
- [ ] API route processes all 3 time ranges (~8-10s total)
- [ ] Rollback deletes snapshot when ranking insert fails
- [ ] `previous_rank` populates correctly (NULL for first snapshot)
- [ ] Timing logs show previous_rank calculation overhead (~50ms)
- [ ] RankBadgeInline displays in artist/track/album lists
- [ ] Chart tooltips show previous rank with change indicator
- [ ] Chart dots appear at significant rank changes (±5)
- [ ] Cache invalidation clears sparkline cache after snapshot
- [ ] Success toast appears after snapshot completion
- [ ] Edge function also calculates `previous_rank` identically
- [ ] Documentation updated in AGENTS.md and README.md

## Documentation Updates

### AGENTS.md

Add to "Database Types (CRITICAL - STRICT RULE)" section:

```markdown
**Available tables with previous_rank field:**
- `artist_rankings.previous_rank` - Rank from previous snapshot in same time range (NULL if new)
- `track_rankings.previous_rank` - Rank from previous snapshot in same time range (NULL if new)
- `album_rankings.previous_rank` - Rank from previous snapshot in same time range (NULL if new)

**Usage example:**
```typescript
type ArtistRanking = Database['public']['Tables']['artist_rankings']['Row'];
// Now includes: previous_rank: number | null

// Display rank change
if (artist.previous_rank) {
  const change = artist.previous_rank - artist.rank;
  console.log(`Rank change: ${change > 0 ? '↑' : '↓'}${Math.abs(change)}`);
}
```
```

### README.md

Add to features section:

```markdown
- **Rank Change Visualization**
  - Color-coded badges showing position changes (↑5, ↓3, NEW, —)
  - Inline badges in artist/track/album lists
  - Enhanced charts with colored dots at significant rank changes (±5 positions)
  - Tooltips show previous rank: "Rank 3 (was 8, ↑5)"
  - Progressive enhancement: works with or without historical data
```

## Notes

- Keep 24-hour rate limit (covers all 3 time ranges)
- Partial success pattern: Continue processing remaining ranges if one fails
- Return simple success boolean (true if any range succeeded)
- Use existing Sonner toast system with auto-hide (3 seconds)
- Progressive enhancement: Rank badges only show when `previous_rank` exists
- Performance monitoring: Log timing for previous_rank calculation
- Atomic rollback per time range: Delete snapshot on any ranking insert failure
- Chart annotations: Show colored dots only at significant changes (±5 positions)
