-- 003_create_indexes.sql
-- Performance indexes for common queries

-- Snapshots indexes
CREATE INDEX IF NOT EXISTS idx_snapshots_user_id ON snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_user_time_range ON snapshots(user_id, time_range);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON snapshots(created_at DESC);

-- Artist rankings indexes
CREATE INDEX IF NOT EXISTS idx_artist_rankings_snapshot_id ON artist_rankings(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_artist_rankings_user_id ON artist_rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_artist_rankings_artist_id ON artist_rankings(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_rankings_user_artist ON artist_rankings(user_id, artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_rankings_rank ON artist_rankings(rank);

-- Track rankings indexes
CREATE INDEX IF NOT EXISTS idx_track_rankings_snapshot_id ON track_rankings(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_track_rankings_user_id ON track_rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_track_rankings_track_id ON track_rankings(track_id);
CREATE INDEX IF NOT EXISTS idx_track_rankings_user_track ON track_rankings(user_id, track_id);
CREATE INDEX IF NOT EXISTS idx_track_rankings_rank ON track_rankings(rank);

-- Album rankings indexes
CREATE INDEX IF NOT EXISTS idx_album_rankings_snapshot_id ON album_rankings(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_album_rankings_user_id ON album_rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_album_rankings_album_id ON album_rankings(album_id);
CREATE INDEX IF NOT EXISTS idx_album_rankings_user_album ON album_rankings(user_id, album_id);
CREATE INDEX IF NOT EXISTS idx_album_rankings_rank ON album_rankings(rank);

-- Composite indexes for historical queries
CREATE INDEX IF NOT EXISTS idx_artist_rankings_history ON artist_rankings(user_id, artist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_track_rankings_history ON track_rankings(user_id, track_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_album_rankings_history ON album_rankings(user_id, album_id, created_at DESC);
