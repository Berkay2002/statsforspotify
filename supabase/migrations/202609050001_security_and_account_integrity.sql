-- Apply after the checked-in schema. No historical rows are deleted or rewritten.
BEGIN;

-- RLS does not govern TRUNCATE. GRANT ALL in the old dump exposed it directly.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.snapshots, public.artist_rankings, public.track_rankings, public.album_rankings,
  public.artist_listening_stats, public.friendships, public.user_profiles, public.spotify_connections
  FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE
  public.snapshots, public.artist_rankings, public.track_rankings, public.album_rankings,
  public.artist_listening_stats, public.friendships, public.user_profiles, public.spotify_connections
  FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR target_user_id IS NULL OR auth.uid() <> target_user_id THEN
    RAISE EXCEPTION 'You can only delete your own account' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(target_user_id::text || ':listening-stats', 0));
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR target_user_id IS NULL OR auth.uid() <> target_user_id THEN
    RAISE EXCEPTION 'You can only delete your own data' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(target_user_id::text || ':listening-stats', 0));
  DELETE FROM public.artist_rankings WHERE user_id = target_user_id;
  DELETE FROM public.track_rankings WHERE user_id = target_user_id;
  DELETE FROM public.album_rankings WHERE user_id = target_user_id;
  DELETE FROM public.snapshots WHERE user_id = target_user_id;
  DELETE FROM public.artist_listening_stats WHERE user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.export_user_data(target_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR target_user_id IS NULL OR auth.uid() <> target_user_id THEN
    RAISE EXCEPTION 'You can only export your own data' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'exported_at', now(), 'user_id', target_user_id,
    'profile', (SELECT to_jsonb(p) FROM public.user_profiles p WHERE p.user_id = target_user_id),
    'snapshots', (SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.created_at, s.id), '[]') FROM public.snapshots s WHERE s.user_id = target_user_id),
    'artist_rankings', (SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at, r.id), '[]') FROM public.artist_rankings r WHERE r.user_id = target_user_id),
    'track_rankings', (SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at, r.id), '[]') FROM public.track_rankings r WHERE r.user_id = target_user_id),
    'album_rankings', (SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at, r.id), '[]') FROM public.album_rankings r WHERE r.user_id = target_user_id),
    'artist_listening_stats', (SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.artist_id), '[]') FROM public.artist_listening_stats s WHERE s.user_id = target_user_id),
    'friendships', (SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.id), '[]') FROM public.friendships f WHERE target_user_id IN (f.user_id, f.friend_id)),
    'spotify_connection', (SELECT to_jsonb(c) - 'refresh_token' FROM public.spotify_connections c WHERE c.user_id = target_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account(uuid), public.delete_user_data(uuid), public.export_user_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid), public.delete_user_data(uuid), public.export_user_data(uuid) TO authenticated;

-- OAuth refresh tokens are used only by trusted server code and the collector.
REVOKE ALL ON TABLE public.spotify_connections FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.spotify_connections TO service_role;

DROP POLICY "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- This function may be attached to auth.users in installations whose auth schema
-- is not included in the public schema dump. Do not introduce a second trigger.
CREATE OR REPLACE FUNCTION public.create_user_profile_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  profile_name text := coalesce(nullif(NEW.raw_user_meta_data->>'display_name', ''), 'User');
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name, discriminator)
  VALUES (NEW.id, profile_name, public.generate_discriminator(profile_name))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_user_profile_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_spotify_connections_updated_at(), public.set_updated_at()
  FROM PUBLIC, anon, authenticated;

DROP POLICY "Users can send friend requests" ON public.friendships;
CREATE POLICY "Users can send friend requests" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'pending');

CREATE OR REPLACE FUNCTION public.enforce_friendship_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.friend_id IS DISTINCT FROM OLD.friend_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Friendship participants and identity cannot change' USING ERRCODE = '42501';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'accepted'
     AND (OLD.status <> 'pending' OR auth.uid() IS NULL OR auth.uid() <> OLD.friend_id) THEN
    RAISE EXCEPTION 'Only the recipient can accept a pending friend request' USING ERRCODE = '42501';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'pending' THEN
    RAISE EXCEPTION 'Remove the existing friendship before sending a new request' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_friendship_transition() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enforce_friendship_transition BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.enforce_friendship_transition();

-- Callers may inspect their own relationship, not enumerate the private graph.
CREATE OR REPLACE FUNCTION public.check_friendship_status(p_user_id_1 uuid, p_user_id_2 uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() NOT IN (p_user_id_1, p_user_id_2) THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.friendships
    WHERE status = 'accepted' AND ((user_id = p_user_id_1 AND friend_id = p_user_id_2)
      OR (user_id = p_user_id_2 AND friend_id = p_user_id_1)));
END;
$$;

DROP POLICY "Users can view their album rankings and friends' rankings" ON public.album_rankings;
DROP POLICY "Users can view their artist rankings and friends' rankings" ON public.artist_rankings;
DROP POLICY "Users can view their track rankings and friends' rankings" ON public.track_rankings;
DROP POLICY "Users can view their snapshots and friends' snapshots" ON public.snapshots;
DROP POLICY "Users can view their own artist stats" ON public.artist_listening_stats;
CREATE POLICY "Stats visibility" ON public.album_rankings FOR SELECT USING (public.can_view_user_stats(user_id));
CREATE POLICY "Stats visibility" ON public.artist_rankings FOR SELECT USING (public.can_view_user_stats(user_id));
CREATE POLICY "Stats visibility" ON public.track_rankings FOR SELECT USING (public.can_view_user_stats(user_id));
CREATE POLICY "Stats visibility" ON public.snapshots FOR SELECT USING (public.can_view_user_stats(user_id));
CREATE POLICY "Stats visibility" ON public.artist_listening_stats FOR SELECT USING (public.can_view_user_stats(user_id));

-- A ranking's owner must also own its parent snapshot. Fail safely if historical
-- mismatches exist; investigate those rows before applying this migration.
ALTER TABLE public.snapshots ADD CONSTRAINT snapshots_id_user_id_key UNIQUE (id, user_id);
ALTER TABLE public.artist_rankings DROP CONSTRAINT artist_rankings_snapshot_id_fkey;
ALTER TABLE public.track_rankings DROP CONSTRAINT track_rankings_snapshot_id_fkey;
ALTER TABLE public.album_rankings DROP CONSTRAINT album_rankings_snapshot_id_fkey;
ALTER TABLE public.artist_rankings ADD CONSTRAINT artist_rankings_snapshot_id_fkey
  FOREIGN KEY (snapshot_id, user_id) REFERENCES public.snapshots(id, user_id) ON DELETE CASCADE;
ALTER TABLE public.track_rankings ADD CONSTRAINT track_rankings_snapshot_id_fkey
  FOREIGN KEY (snapshot_id, user_id) REFERENCES public.snapshots(id, user_id) ON DELETE CASCADE;
ALTER TABLE public.album_rankings ADD CONSTRAINT album_rankings_snapshot_id_fkey
  FOREIGN KEY (snapshot_id, user_id) REFERENCES public.snapshots(id, user_id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.refresh_artist_listening_stats_for_user(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_user_id IS NULL OR (auth.role() IS DISTINCT FROM 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id)) THEN
    RAISE EXCEPTION 'You can only refresh your own listening stats' USING ERRCODE = '42501';
  END IF;
  -- Shared with snapshot persistence and deletion, including concurrent ranges.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':listening-stats', 0));
  DELETE FROM public.artist_listening_stats s WHERE s.user_id = p_user_id
    AND NOT EXISTS (SELECT 1 FROM public.track_rankings tr WHERE tr.user_id = s.user_id AND tr.artist_id = s.artist_id);
  INSERT INTO public.artist_listening_stats (
    user_id, artist_id, artist_name, total_play_count, total_duration_ms,
    unique_tracks_count, first_tracked_at, last_tracked_at, updated_at
  )
  SELECT tr.user_id, tr.artist_id, (array_agg(tr.artist_name ORDER BY tr.created_at DESC, tr.id))[1],
    count(*), coalesce(sum(tr.duration_ms), 0), count(DISTINCT tr.track_id), min(tr.created_at), max(tr.created_at), now()
  FROM public.track_rankings tr
  WHERE tr.user_id = p_user_id
  GROUP BY tr.user_id, tr.artist_id
  ON CONFLICT (user_id, artist_id) DO UPDATE SET
    artist_name = excluded.artist_name, total_play_count = excluded.total_play_count,
    total_duration_ms = excluded.total_duration_ms, unique_tracks_count = excluded.unique_tracks_count,
    first_tracked_at = excluded.first_tracked_at, last_tracked_at = excluded.last_tracked_at, updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_artist_listening_stats_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_artist_listening_stats_for_user(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_artist_listening_stats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE target_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    PERFORM public.refresh_artist_listening_stats_for_user(auth.uid());
  ELSIF auth.role() = 'service_role' THEN
    FOR target_id IN
      SELECT user_id FROM public.track_rankings
      UNION SELECT user_id FROM public.artist_listening_stats
      ORDER BY user_id
    LOOP
      PERFORM public.refresh_artist_listening_stats_for_user(target_id);
    END LOOP;
  ELSE
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_artist_listening_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_artist_listening_stats() TO authenticated, service_role;

-- Legacy SECURITY DEFINER readers are updated below without changing their
-- argument names or output columns, preserving PostgREST overload resolution.
CREATE OR REPLACE FUNCTION "public"."get_latest_snapshot"("target_user_id" "uuid", "target_time_range" "text" DEFAULT 'medium_term'::"text") RETURNS TABLE("snapshot_id" "uuid", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  PERFORM public.assert_can_view_user_stats(target_user_id);
  RETURN QUERY
  SELECT s.id, s.created_at
  FROM snapshots s
  WHERE s.user_id = target_user_id
    AND s.time_range = target_time_range
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_ranking_history"("p_user_id" "uuid", "p_item_id" "text", "p_item_type" "text", "p_time_range" "text") RETURNS TABLE("date" timestamp with time zone, "rank" integer, "is_new_entry" boolean, "is_reentry" boolean, "peak_rank" integer, "time_range" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
BEGIN
  PERFORM public.assert_can_view_user_stats(p_user_id);
  RETURN QUERY
  EXECUTE format(
    'WITH timeline AS (
      SELECT s.*, ROW_NUMBER() OVER (PARTITION BY s.time_range ORDER BY s.created_at, s.id) AS snapshot_number
      FROM public.snapshots s
      WHERE s.user_id = $1 AND ($3 IS NULL OR s.time_range = $3)
    ), ranked_data AS (
      SELECT 
        s.created_at as date,
        r.rank,
        s.time_range,
        s.snapshot_number,
        LAG(s.snapshot_number) OVER (PARTITION BY s.time_range ORDER BY s.created_at, s.id) as prev_snapshot_number,
        ROW_NUMBER() OVER (PARTITION BY s.time_range ORDER BY s.created_at, s.id) as row_num,
        MIN(r.rank) OVER (PARTITION BY s.time_range) as peak_rank
      FROM public.%I r
      JOIN timeline s ON r.snapshot_id = s.id
      WHERE r.user_id = $1 
        AND r.%I = $2
        AND ($3 IS NULL OR s.time_range = $3)
      ORDER BY s.created_at ASC
    )
    SELECT 
      date,
      rank,
      (row_num = 1) as is_new_entry,
      (prev_snapshot_number IS NOT NULL AND snapshot_number > prev_snapshot_number + 1) as is_reentry,
      peak_rank,
      time_range
    FROM ranked_data
    ORDER BY date ASC',
    CASE p_item_type
      WHEN 'artist' THEN 'artist_rankings'
      WHEN 'track' THEN 'track_rankings'
      WHEN 'album' THEN 'album_rankings'
      ELSE 'artist_rankings'
    END,
    CASE p_item_type
      WHEN 'artist' THEN 'artist_id'
      WHEN 'track' THEN 'track_id'
      WHEN 'album' THEN 'album_id'
      ELSE 'artist_id'
    END
  )
  USING p_user_id, p_item_id, p_time_range;
END;
$_$;

CREATE OR REPLACE FUNCTION "public"."get_ranking_history"("p_user_id" "uuid", "p_entity_id" "text", "p_entity_type" "text", "p_time_range" "text", "p_limit" integer DEFAULT 100) RETURNS TABLE("snapshot_id" "uuid", "created_at" timestamp with time zone, "rank" integer, "previous_rank" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  PERFORM public.assert_can_view_user_stats(p_user_id);
  IF p_entity_type = 'artist' THEN
    RETURN QUERY
    SELECT ar.snapshot_id, s.created_at, ar.rank, ar.previous_rank
    FROM artist_rankings ar
    JOIN snapshots s ON ar.snapshot_id = s.id
    WHERE ar.user_id = p_user_id
      AND ar.artist_id = p_entity_id
      AND s.time_range = p_time_range
    ORDER BY s.created_at DESC
    LIMIT p_limit;
  ELSIF p_entity_type = 'track' THEN
    RETURN QUERY
    SELECT tr.snapshot_id, s.created_at, tr.rank, tr.previous_rank
    FROM track_rankings tr
    JOIN snapshots s ON tr.snapshot_id = s.id
    WHERE tr.user_id = p_user_id
      AND tr.track_id = p_entity_id
      AND s.time_range = p_time_range
    ORDER BY s.created_at DESC
    LIMIT p_limit;
  ELSIF p_entity_type = 'album' THEN
    RETURN QUERY
    SELECT alr.snapshot_id, s.created_at, alr.rank, alr.previous_rank
    FROM album_rankings alr
    JOIN snapshots s ON alr.snapshot_id = s.id
    WHERE alr.user_id = p_user_id
      AND alr.album_id = p_entity_id
      AND s.time_range = p_time_range
    ORDER BY s.created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_sparkline_data"("p_user_id" "uuid", "p_item_ids" "text"[], "p_item_type" "text", "p_days" integer) RETURNS TABLE("item_id" "text", "date" timestamp with time zone, "rank" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
BEGIN
  PERFORM public.assert_can_view_user_stats(p_user_id);
  RETURN QUERY
  EXECUTE format(
    'SELECT 
      r.%I as item_id,
      s.created_at as date,
      r.rank
    FROM public.%I r
    JOIN public.snapshots s ON s.id = r.snapshot_id
    WHERE r.user_id = $1 
      AND r.%I = ANY($2)
      AND s.created_at >= NOW() - ($3 || '' days'')::INTERVAL
    ORDER BY r.%I, s.created_at ASC',
    CASE p_item_type
      WHEN 'artist' THEN 'artist_id'
      WHEN 'track' THEN 'track_id'
      WHEN 'album' THEN 'album_id'
      ELSE 'artist_id'
    END,
    CASE p_item_type
      WHEN 'artist' THEN 'artist_rankings'
      WHEN 'track' THEN 'track_rankings'
      WHEN 'album' THEN 'album_rankings'
      ELSE 'artist_rankings'
    END,
    CASE p_item_type
      WHEN 'artist' THEN 'artist_id'
      WHEN 'track' THEN 'track_id'
      WHEN 'album' THEN 'album_id'
      ELSE 'artist_id'
    END,
    CASE p_item_type
      WHEN 'artist' THEN 'artist_id'
      WHEN 'track' THEN 'track_id'
      WHEN 'album' THEN 'album_id'
      ELSE 'artist_id'
    END
  )
  USING p_user_id, p_item_ids, p_days;
END;
$_$;

CREATE OR REPLACE FUNCTION "public"."get_sparkline_data"("p_user_id" "uuid", "p_entity_id" "text", "p_entity_type" "text", "p_time_range" "text", "p_limit" integer DEFAULT 30) RETURNS TABLE("created_at" timestamp with time zone, "rank" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  PERFORM public.assert_can_view_user_stats(p_user_id);
  IF p_entity_type = 'artist' THEN
    RETURN QUERY
    SELECT s.created_at, ar.rank
    FROM artist_rankings ar
    JOIN snapshots s ON ar.snapshot_id = s.id
    WHERE ar.user_id = p_user_id
      AND ar.artist_id = p_entity_id
      AND s.time_range = p_time_range
    ORDER BY s.created_at DESC
    LIMIT p_limit;
  ELSIF p_entity_type = 'track' THEN
    RETURN QUERY
    SELECT s.created_at, tr.rank
    FROM track_rankings tr
    JOIN snapshots s ON tr.snapshot_id = s.id
    WHERE tr.user_id = p_user_id
      AND tr.track_id = p_entity_id
      AND s.time_range = p_time_range
    ORDER BY s.created_at DESC
    LIMIT p_limit;
  ELSIF p_entity_type = 'album' THEN
    RETURN QUERY
    SELECT s.created_at, alr.rank
    FROM album_rankings alr
    JOIN snapshots s ON alr.snapshot_id = s.id
    WHERE alr.user_id = p_user_id
      AND alr.album_id = p_entity_id
      AND s.time_range = p_time_range
    ORDER BY s.created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$;

COMMIT;
