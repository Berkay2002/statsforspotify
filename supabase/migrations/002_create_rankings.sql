-- 002_create_rankings.sql
-- Tables for storing artist, track, and album rankings

-- Artist rankings
CREATE TABLE IF NOT EXISTS artist_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  artist_image_url TEXT,
  genres TEXT[] DEFAULT '{}',
  popularity INTEGER,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Track rankings
CREATE TABLE IF NOT EXISTS track_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  track_image_url TEXT,
  artist_id TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_id TEXT NOT NULL,
  album_name TEXT NOT NULL,
  duration_ms INTEGER,
  popularity INTEGER,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Album rankings (derived from tracks)
CREATE TABLE IF NOT EXISTS album_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id TEXT NOT NULL,
  album_name TEXT NOT NULL,
  album_image_url TEXT,
  artist_id TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  release_date TEXT,
  total_tracks INTEGER,
  track_count INTEGER NOT NULL DEFAULT 1, -- Number of tracks from this album in top tracks
  rank INTEGER NOT NULL CHECK (rank >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE artist_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_rankings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE artist_rankings IS 'User top artist rankings per snapshot';
COMMENT ON TABLE track_rankings IS 'User top track rankings per snapshot';
COMMENT ON TABLE album_rankings IS 'User album rankings derived from top tracks';
