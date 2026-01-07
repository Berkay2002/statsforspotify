## Plan: Historical Ranking Charts with Badges

Add performant line charts showing position changes over time with time range filtering, entry badges (7-day gap threshold for re-entry detection), peak indicators, and mini sparklines on list pages using batched queries optimized for daily snapshot frequency.

---

### Step 1: Database Function — `get_ranking_history`

**File:** `supabase/migrations/007_add_ranking_history_function.sql`
**Tool:** `mcp_supabase_apply_migration`

Create a PostgreSQL function that returns historical ranking data with computed metadata using window functions for optimal performance.

**Function Signature:**
```sql
get_ranking_history(
  p_user_id UUID,
  p_item_id TEXT,
  p_item_type TEXT,        -- 'artist' | 'track' | 'album'
  p_time_range TEXT DEFAULT NULL  -- 'short_term' | 'medium_term' | 'long_term' | NULL (all)
) RETURNS TABLE (
  date TIMESTAMPTZ,
  rank INTEGER,
  is_new_entry BOOLEAN,
  is_reentry BOOLEAN,
  peak_rank INTEGER,
  time_range TEXT
)
```

**Implementation Details:**
- Use `LAG(created_at) OVER (ORDER BY created_at)` to compute previous snapshot date
- Re-entry detection: `created_at - LAG(created_at) >= INTERVAL '7 days'`
- New entry: `ROW_NUMBER() OVER (ORDER BY created_at) = 1`
- Peak rank: `MIN(rank) OVER ()` computed across entire history
- Dynamic table selection via `CASE p_item_type WHEN 'artist' THEN ... END`
- Filter by `time_range` if provided, joining with `snapshots` table
- Leverages existing indexes: `idx_artist_rankings_history`, `idx_track_rankings_history`, `idx_album_rankings_history`

**Expected Query Plan:** Index scan on `(user_id, *_id, created_at DESC)` → O(log n) lookup

---

### Step 2: Database Function — `get_sparkline_data`

**File:** `supabase/migrations/007_add_ranking_history_function.sql` (same migration)
**Tool:** `mcp_supabase_apply_migration`

Create a batch function for fetching sparkline data for multiple items in a single query.

**Function Signature:**
```sql
get_sparkline_data(
  p_user_id UUID,
  p_item_ids TEXT[],
  p_item_type TEXT,        -- 'artist' | 'track' | 'album'
  p_days INTEGER DEFAULT 14
) RETURNS TABLE (
  item_id TEXT,
  date TIMESTAMPTZ,
  rank INTEGER
)
```

**Implementation Details:**
- Use `WHERE *_id = ANY(p_item_ids)` for batch lookup
- Filter: `created_at >= NOW() - (p_days || ' days')::INTERVAL`
- Order by `item_id, created_at ASC` for client-side grouping
- Single query for 50 items vs 50 individual requests
- Returns raw data; client groups by `item_id` into `Record<string, {date, rank}[]>`

**Performance:** Single index scan with `IN` clause, ~5-10ms for 50 items × 14 days

---

### Step 3: Component — `<SparklineChart>`

**File:** `components/charts/sparkline-chart.tsx`

Minimal, memoized sparkline for inline display on list pages.

**Props Interface:**
```typescript
interface SparklineChartProps {
  data: { date: string; rank: number }[];
  width?: number;      // default: 64
  height?: number;     // default: 24
  color?: string;      // default: "hsl(var(--primary))"
  showTrend?: boolean; // default: true, colors line green/red based on trend
}
```

**Implementation Details:**
- Wrap in `React.memo()` with custom comparison (shallow compare `data` array length + first/last values)
- Recharts `<LineChart>` with `<Line type="monotone" dot={false} strokeWidth={1.5} />`
- No `<XAxis>`, `<YAxis>`, `<Tooltip>`, `<CartesianGrid>` — pure visual
- Y-axis domain: `[Math.min(...ranks), Math.max(...ranks)]` reversed (rank 1 at top)
- Trend detection: compare first vs last rank, apply `stroke` color accordingly
  - Improved (lower rank): green `hsl(var(--chart-2))`
  - Declined (higher rank): red `hsl(var(--destructive))`
  - Stable: neutral `hsl(var(--muted-foreground))`
- Container: `<div className="flex items-center justify-center">` with fixed dimensions
- Empty state: render flat gray line or nothing

**Usage:**
```tsx
<SparklineChart data={sparklines[track.id] ?? []} width={64} height={24} />
```

---

### Step 4: Extend `<RankingChart>`

**File:** `components/charts/ranking-chart.tsx`

Add peak position indicator and time range filtering to existing chart.

**Updated Props Interface:**
```typescript
interface RankingChartProps {
  title: string;
  data: RankingHistory[];
  color?: string;
  peakPosition?: number;      // NEW: renders horizontal reference line
  timeRange?: TimeRange;      // NEW: for display context
  showPeakLabel?: boolean;    // NEW: default true
}
```

**New Features:**
- Import `<ReferenceLine>` from Recharts
- Render peak line: `<ReferenceLine y={peakPosition} stroke="hsl(var(--chart-4))" strokeDasharray="4 4" label={{ value: `Peak: #${peakPosition}`, position: "right" }} />`
- Add subtle annotation showing peak date on tooltip when hovering near peak
- Optional `timeRange` badge in title area showing which period is displayed

**Visual Updates:**
- Peak line: dashed gold/yellow line at peak rank position
- Label positioned on right side, small font
- Tooltip enhancement: show "🏆 Peak!" when hovering on peak data point

---

### Step 5: Component — `<RankingBadge>`

**File:** `components/charts/ranking-badge.tsx`

Display entry status badges for tracks/artists/albums.

**Props Interface:**
```typescript
interface RankingBadgeProps {
  isNewEntry?: boolean;
  isReentry?: boolean;
  className?: string;
}
```

**Implementation Details:**
- Uses `<Badge>` from `@/components/ui/badge`
- New Entry: `<Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">🆕 New Entry</Badge>`
- Re-entry: `<Badge variant="outline" className="text-blue-600 border-blue-500/30">↩️ Re-entry</Badge>`
- Returns `null` if neither flag is true
- Only show badge for most recent data point (don't clutter historical view)

**Usage:**
```tsx
<RankingBadge isNewEntry={history.isNewEntry} isReentry={history.isReentry} />
```

---

### Step 6: API Route — `/api/rankings/history`

**File:** `app/api/rankings/history/route.ts`

Server-side endpoint for fetching ranking history with metadata.

**Query Parameters:**
- `type` (required): `'artist' | 'track' | 'album'`
- `id` (required): Spotify item ID
- `time_range` (optional): `'short_term' | 'medium_term' | 'long_term'`

**Response Shape:**
```typescript
interface RankingHistoryResponse {
  history: {
    date: string;
    rank: number;
    isNewEntry: boolean;
    isReentry: boolean;
  }[];
  metadata: {
    peakRank: number;
    peakDate: string;
    totalSnapshots: number;
    firstSeen: string;
    lastSeen: string;
    currentRank: number | null;  // null if dropped off
  };
}
```

**Implementation:**
1. Validate auth via `createClient()` from `@/lib/supabase/server`
2. Validate query params (return 400 if invalid)
3. Call `supabase.rpc('get_ranking_history', { p_user_id, p_item_id, p_item_type, p_time_range })`
4. Transform snake_case → camelCase
5. Compute metadata from results (peak, first/last seen, etc.)
6. Return JSON with `Cache-Control: private, max-age=300` (5 min cache)

**Error Handling:**
- 401: Not authenticated
- 400: Missing/invalid params
- 404: No history found
- 500: Database error

---

### Step 7: API Route — `/api/rankings/sparklines`

**File:** `app/api/rankings/sparklines/route.ts`

Batch endpoint for list page sparkline data.

**Query Parameters:**
- `type` (required): `'artist' | 'track' | 'album'`
- `ids` (required): Comma-separated Spotify IDs (max 50)
- `days` (optional): Number of days, default 14

**Response Shape:**
```typescript
interface SparklineResponse {
  sparklines: Record<string, { date: string; rank: number }[]>;
}
```

**Implementation:**
1. Validate auth
2. Parse `ids` into array, validate length ≤ 50
3. Call `supabase.rpc('get_sparkline_data', { p_user_id, p_item_ids, p_item_type, p_days })`
4. Group results by `item_id` into Record
5. Return JSON with `Cache-Control: private, max-age=60` (1 min cache for fresher list data)

**Optimization:**
- Single database round-trip for all items
- Client can request only visible items if implementing virtualization later

---

### Step 8: Update List Pages

**Files:**
- `app/(protected)/dashboard/tracks/page.tsx`
- `app/(protected)/dashboard/artists/page.tsx`
- `app/(protected)/dashboard/albums/page.tsx`

Add inline sparklines to each ranking card.

**Changes Required:**

1. **Convert to Client Component** (add `"use client"` directive) or create wrapper component
2. **Add state for sparklines:**
   ```typescript
   const [sparklines, setSparklines] = useState<Record<string, {date: string; rank: number}[]>>({});
   ```
3. **Fetch sparklines on mount:**
   ```typescript
   useEffect(() => {
     const ids = items.map(item => item.id).join(',');
     fetch(`/api/rankings/sparklines?type=track&ids=${ids}`)
       .then(res => res.json())
       .then(data => setSparklines(data.sparklines));
   }, [items]);
   ```
4. **Render sparkline in card:**
   ```tsx
   <div className="flex items-center gap-3">
     <span className="text-sm text-muted-foreground">#{rank}</span>
     <SparklineChart data={sparklines[item.id] ?? []} />
   </div>
   ```

**Layout Update:**
- Add sparkline between rank number and item details
- Adjust card grid to accommodate: `grid-cols-[auto,64px,1fr,auto]`
- Loading state: show `<Skeleton className="w-16 h-6" />` while fetching

**Alternative (Server Component Pattern):**
- Keep page as Server Component
- Create `<SparklineLoader itemIds={ids} type="track">` client component that fetches and renders
- Pass item IDs as prop, render sparklines in client boundary

---

### Step 9: Update Detail Pages

**Files:**
- `app/(protected)/dashboard/tracks/[id]/page.tsx`
- `app/(protected)/dashboard/albums/[id]/page.tsx`
- `app/(protected)/dashboard/artists/[id]/page.tsx`

Add time range selector, badges, and enhanced chart.

**Changes Required:**

1. **Add time range state** (convert to client or use URL params):
   ```typescript
   const [timeRange, setTimeRange] = useState<TimeRange | 'all'>('all');
   ```

2. **Fetch history with filter:**
   ```typescript
   const { data: historyData } = await fetch(
     `/api/rankings/history?type=track&id=${id}&time_range=${timeRange}`
   ).then(res => res.json());
   ```

3. **Add time range selector UI:**
   ```tsx
   <div className="flex items-center justify-between mb-4">
     <div className="flex items-center gap-2">
       <h3 className="text-lg font-semibold">Ranking History</h3>
       <RankingBadge 
         isNewEntry={historyData.metadata.totalSnapshots === 1} 
         isReentry={historyData.history[historyData.history.length - 1]?.isReentry} 
       />
     </div>
     <Select value={timeRange} onValueChange={setTimeRange}>
       <SelectTrigger className="w-[180px]">
         <SelectValue placeholder="Time range" />
       </SelectTrigger>
       <SelectContent>
         <SelectItem value="all">All Time</SelectItem>
         <SelectItem value="short_term">Last 4 Weeks</SelectItem>
         <SelectItem value="medium_term">Last 6 Months</SelectItem>
         <SelectItem value="long_term">All Time (Long)</SelectItem>
       </SelectContent>
     </Select>
   </div>
   ```

4. **Pass peak to chart:**
   ```tsx
   <RankingChart 
     title="Position Over Time"
     data={historyData.history}
     peakPosition={historyData.metadata.peakRank}
     timeRange={timeRange}
   />
   ```

5. **Add stats summary:**
   ```tsx
   <div className="grid grid-cols-4 gap-4 mt-4">
     <Card><CardContent className="pt-4">
       <div className="text-2xl font-bold">#{historyData.metadata.peakRank}</div>
       <div className="text-sm text-muted-foreground">Peak Position</div>
     </CardContent></Card>
     <Card><CardContent className="pt-4">
       <div className="text-2xl font-bold">{historyData.metadata.totalSnapshots}</div>
       <div className="text-sm text-muted-foreground">Times Charted</div>
     </CardContent></Card>
     <!-- ... current rank, first seen date ... -->
   </div>
   ```

**Artist Detail Page Special Case:**
- Currently a client component using `useSWR`
- Add ranking history fetch alongside existing artist details
- May need to add `/api/artists/[id]/history` or use generic `/api/rankings/history`

---

### File Structure Summary

```
supabase/migrations/
  007_add_ranking_history_functions.sql    # NEW

components/charts/
  ranking-chart.tsx                        # MODIFY (add peak line, time range)
  sparkline-chart.tsx                      # NEW
  ranking-badge.tsx                        # NEW

app/api/rankings/
  history/route.ts                         # NEW
  sparklines/route.ts                      # NEW

app/(protected)/dashboard/
  tracks/page.tsx                          # MODIFY (add sparklines)
  tracks/[id]/page.tsx                     # MODIFY (add time range, badge, peak)
  artists/page.tsx                         # MODIFY (add sparklines)
  artists/[id]/page.tsx                    # MODIFY (add chart, time range, badge)
  albums/page.tsx                          # MODIFY (add sparklines)
  albums/[id]/page.tsx                     # MODIFY (add time range, badge, peak)

lib/spotify/types.ts                       # MODIFY (add RankingHistoryResponse type)
```

---

### Execution Order

1. ✅ Database migration (functions)
2. ✅ `SparklineChart` component
3. ✅ `RankingBadge` component  
4. ✅ Extend `RankingChart`
5. ✅ API routes (`/history`, `/sparklines`)
6. ✅ Update list pages
7. ✅ Update detail pages
8. ✅ Run `bun run build` + `bun lint` to verify
