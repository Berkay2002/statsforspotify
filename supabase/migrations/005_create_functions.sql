-- 005_create_functions.sql
-- Helper functions for data management

-- Function to delete all user data (required for Spotify compliance)
CREATE OR REPLACE FUNCTION delete_user_data(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is the target user
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only delete your own data';
  END IF;

  -- Delete all rankings (cascades from snapshots, but explicit for clarity)
  DELETE FROM artist_rankings WHERE user_id = target_user_id;
  DELETE FROM track_rankings WHERE user_id = target_user_id;
  DELETE FROM album_rankings WHERE user_id = target_user_id;
  
  -- Delete all snapshots
  DELETE FROM snapshots WHERE user_id = target_user_id;
END;
$$;

-- Function to export user data as JSON (for data portability)
CREATE OR REPLACE FUNCTION export_user_data(target_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Verify the caller is the target user
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only export your own data';
  END IF;

  SELECT jsonb_build_object(
    'exported_at', NOW(),
    'user_id', target_user_id,
    'snapshots', (
      SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
      FROM snapshots s
      WHERE s.user_id = target_user_id
    ),
    'artist_rankings', (
      SELECT COALESCE(jsonb_agg(row_to_json(ar)), '[]'::jsonb)
      FROM artist_rankings ar
      WHERE ar.user_id = target_user_id
    ),
    'track_rankings', (
      SELECT COALESCE(jsonb_agg(row_to_json(tr)), '[]'::jsonb)
      FROM track_rankings tr
      WHERE tr.user_id = target_user_id
    ),
    'album_rankings', (
      SELECT COALESCE(jsonb_agg(row_to_json(abr)), '[]'::jsonb)
      FROM album_rankings abr
      WHERE abr.user_id = target_user_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to get latest snapshot for a user and time range
CREATE OR REPLACE FUNCTION get_latest_snapshot(
  target_user_id UUID,
  target_time_range TEXT DEFAULT 'medium_term'
)
RETURNS TABLE (
  snapshot_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.created_at
  FROM snapshots s
  WHERE s.user_id = target_user_id
    AND s.time_range = target_time_range
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION delete_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION export_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_snapshot(UUID, TEXT) TO authenticated;
