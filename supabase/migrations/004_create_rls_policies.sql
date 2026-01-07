-- 004_create_rls_policies.sql
-- Row Level Security policies for all tables

-- Snapshots policies
CREATE POLICY "Users can view their own snapshots"
  ON snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
  ON snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots"
  ON snapshots FOR DELETE
  USING (auth.uid() = user_id);

-- Artist rankings policies
CREATE POLICY "Users can view their own artist rankings"
  ON artist_rankings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own artist rankings"
  ON artist_rankings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own artist rankings"
  ON artist_rankings FOR DELETE
  USING (auth.uid() = user_id);

-- Track rankings policies
CREATE POLICY "Users can view their own track rankings"
  ON track_rankings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own track rankings"
  ON track_rankings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own track rankings"
  ON track_rankings FOR DELETE
  USING (auth.uid() = user_id);

-- Album rankings policies
CREATE POLICY "Users can view their own album rankings"
  ON album_rankings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own album rankings"
  ON album_rankings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own album rankings"
  ON album_rankings FOR DELETE
  USING (auth.uid() = user_id);
