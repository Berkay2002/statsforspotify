-- 001_create_snapshots.sql
-- Snapshots table to track when data was collected

CREATE TABLE IF NOT EXISTS snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_range TEXT NOT NULL CHECK (time_range IN ('short_term', 'medium_term', 'long_term')),
  UNIQUE(user_id, created_at, time_range)
);

-- Enable RLS
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE snapshots IS 'Tracks when Spotify stats were collected for each user';
COMMENT ON COLUMN snapshots.time_range IS 'Spotify API time range: short_term (4 weeks), medium_term (6 months), long_term (all time)';
