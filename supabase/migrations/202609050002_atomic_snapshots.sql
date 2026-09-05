BEGIN;

-- Index expressions must not depend on the connection's TimeZone setting.
CREATE OR REPLACE FUNCTION public.get_date_only(timestamp_val timestamptz)
RETURNS date LANGUAGE sql IMMUTABLE STRICT SET search_path = ''
AS $$ SELECT (timestamp_val AT TIME ZONE 'UTC')::date $$;
REINDEX INDEX public.snapshots_user_date_timerange_unique;

-- Both collectors use this transaction. An existing snapshot is visible only
-- after every ranking insert has committed, so a retry cannot skip partial work.
CREATE OR REPLACE FUNCTION public.persist_snapshot(
  p_user_id uuid, p_time_range text, p_artists jsonb, p_tracks jsonb, p_albums jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  collected_at timestamptz := transaction_timestamp();
  day_start timestamptz := date_trunc('day', collected_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  snapshot_id uuid;
  previous_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND
     (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_time_range IS NULL OR
     p_time_range NOT IN ('short_term', 'medium_term', 'long_term') THEN
    RAISE EXCEPTION 'Invalid snapshot identity' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_artists) IS DISTINCT FROM 'array' OR
     jsonb_typeof(p_tracks) IS DISTINCT FROM 'array' OR
     jsonb_typeof(p_albums) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Rankings must be arrays' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_artists) > 50 OR jsonb_array_length(p_tracks) > 50 OR
     jsonb_array_length(p_albums) > 50 THEN
    RAISE EXCEPTION 'Too many rankings' USING ERRCODE = '22023';
  END IF;

  -- Shared with aggregate refresh and data/account deletion; serialize all
  -- writes for one user before taking foreign-key locks.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':listening-stats', 0));
  SELECT s.id INTO snapshot_id FROM public.snapshots s
  WHERE s.user_id = p_user_id AND s.time_range = p_time_range
    AND s.created_at >= day_start AND s.created_at < day_start + interval '24 hours';
  IF snapshot_id IS NOT NULL THEN
    PERFORM public.refresh_artist_listening_stats_for_user(p_user_id);
    RETURN jsonb_build_object('snapshotId', snapshot_id, 'skipped', true);
  END IF;

  INSERT INTO public.snapshots(user_id, time_range, created_at)
  VALUES(p_user_id, p_time_range, collected_at)
  ON CONFLICT DO NOTHING RETURNING id INTO snapshot_id;
  IF snapshot_id IS NULL THEN
    SELECT s.id INTO snapshot_id FROM public.snapshots s
    WHERE s.user_id = p_user_id AND s.time_range = p_time_range
      AND s.created_at >= day_start AND s.created_at < day_start + interval '24 hours';
    IF snapshot_id IS NULL THEN RAISE EXCEPTION 'Concurrent snapshot not visible; retry'; END IF;
    PERFORM public.refresh_artist_listening_stats_for_user(p_user_id);
    RETURN jsonb_build_object('snapshotId', snapshot_id, 'skipped', true);
  END IF;
  SELECT s.id INTO previous_id FROM public.snapshots s
  WHERE s.user_id = p_user_id AND s.time_range = p_time_range AND s.created_at < day_start
  ORDER BY s.created_at DESC LIMIT 1;

  INSERT INTO public.artist_rankings(snapshot_id,user_id,artist_id,artist_name,artist_image_url,genres,popularity,rank,previous_rank,created_at)
  SELECT snapshot_id,p_user_id,a.artist_id,a.artist_name,a.artist_image_url,a.genres,a.popularity,a.rank,
    (SELECT r.rank FROM public.artist_rankings r WHERE r.snapshot_id = previous_id AND r.artist_id = a.artist_id ORDER BY r.rank LIMIT 1),collected_at
  FROM jsonb_to_recordset(p_artists) AS a(artist_id text,artist_name text,artist_image_url text,genres text[],popularity integer,rank integer);

  INSERT INTO public.track_rankings(snapshot_id,user_id,track_id,track_name,track_image_url,artist_id,artist_name,album_id,album_name,duration_ms,popularity,rank,previous_rank,created_at)
  SELECT snapshot_id,p_user_id,t.track_id,t.track_name,t.track_image_url,t.artist_id,t.artist_name,t.album_id,t.album_name,t.duration_ms,t.popularity,t.rank,
    (SELECT r.rank FROM public.track_rankings r WHERE r.snapshot_id = previous_id AND r.track_id = t.track_id ORDER BY r.rank LIMIT 1),collected_at
  FROM jsonb_to_recordset(p_tracks) AS t(track_id text,track_name text,track_image_url text,artist_id text,artist_name text,album_id text,album_name text,duration_ms integer,popularity integer,rank integer);

  INSERT INTO public.album_rankings(snapshot_id,user_id,album_id,album_name,album_image_url,artist_id,artist_name,track_count,rank,previous_rank,created_at)
  SELECT snapshot_id,p_user_id,a.album_id,a.album_name,a.album_image_url,a.artist_id,a.artist_name,a.track_count,a.rank,
    (SELECT r.rank FROM public.album_rankings r WHERE r.snapshot_id = previous_id AND r.album_id = a.album_id ORDER BY r.rank LIMIT 1),collected_at
  FROM jsonb_to_recordset(p_albums) AS a(album_id text,album_name text,album_image_url text,artist_id text,artist_name text,track_count integer,rank integer);

  PERFORM public.refresh_artist_listening_stats_for_user(p_user_id);
  RETURN jsonb_build_object('snapshotId',snapshot_id,'skipped',false);
END;
$$;

REVOKE ALL ON FUNCTION public.persist_snapshot(uuid,text,jsonb,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.persist_snapshot(uuid,text,jsonb,jsonb,jsonb) TO authenticated, service_role;
COMMIT;
