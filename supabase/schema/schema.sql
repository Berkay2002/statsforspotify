


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_friendship_status"("p_user_id_1" "uuid", "p_user_id_2" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if an accepted friendship exists between two users (either direction)
  RETURN EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (user_id = p_user_id_1 AND friend_id = p_user_id_2)
        OR 
        (user_id = p_user_id_2 AND friend_id = p_user_id_1)
      )
  );
END;
$$;


ALTER FUNCTION "public"."check_friendship_status"("p_user_id_1" "uuid", "p_user_id_2" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_friendship_status"("p_user_id_1" "uuid", "p_user_id_2" "uuid") IS 'Checks if two users have an accepted friendship (either direction)';



CREATE OR REPLACE FUNCTION "public"."create_user_profile_on_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, discriminator)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
    generate_discriminator()
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_profile_on_signup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_account"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify the user is deleting their own account
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Delete the user from auth.users
  -- This will cascade to all related tables due to foreign key constraints
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."delete_user_account"("target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_user_account"("target_user_id" "uuid") IS 'Deletes a user account from auth.users. Can only be called by the user themselves.';



CREATE OR REPLACE FUNCTION "public"."delete_user_data"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."delete_user_data"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."export_user_data"("target_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."export_user_data"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_discriminator"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  result TEXT;
BEGIN
  result := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_discriminator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_discriminator"("p_display_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_discriminator TEXT;
  v_attempts INT := 0;
  v_max_attempts INT := 100;
BEGIN
  LOOP
    -- Generate random 4-digit number
    v_discriminator := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Check if this combination exists
    IF NOT EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE display_name = p_display_name 
      AND discriminator = v_discriminator
    ) THEN
      RETURN v_discriminator;
    END IF;
    
    v_attempts := v_attempts + 1;
    IF v_attempts >= v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique discriminator after % attempts', v_max_attempts;
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."generate_discriminator"("p_display_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_date_only"("timestamp_val" timestamp with time zone) RETURNS "date"
    LANGUAGE "plpgsql" IMMUTABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN timestamp_val::DATE;
END;
$$;


ALTER FUNCTION "public"."get_date_only"("timestamp_val" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_latest_snapshot"("target_user_id" "uuid", "target_time_range" "text" DEFAULT 'medium_term'::"text") RETURNS TABLE("snapshot_id" "uuid", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_latest_snapshot"("target_user_id" "uuid", "target_time_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ranking_history"("p_user_id" "uuid", "p_item_id" "text", "p_item_type" "text", "p_time_range" "text") RETURNS TABLE("date" timestamp with time zone, "rank" integer, "is_new_entry" boolean, "is_reentry" boolean, "peak_rank" integer, "time_range" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
BEGIN
  RETURN QUERY
  EXECUTE format(
    'WITH ranked_data AS (
      SELECT 
        r.created_at as date,
        r.rank,
        s.time_range,
        LAG(r.created_at) OVER (ORDER BY r.created_at) as prev_date,
        ROW_NUMBER() OVER (ORDER BY r.created_at) as row_num,
        MIN(r.rank) OVER () as peak_rank
      FROM %I r
      JOIN snapshots s ON r.snapshot_id = s.id
      WHERE r.user_id = $1 
        AND r.%I = $2
        AND ($3 IS NULL OR s.time_range = $3)
      ORDER BY r.created_at ASC
    )
    SELECT 
      date,
      rank,
      (row_num = 1) as is_new_entry,
      (prev_date IS NOT NULL AND date - prev_date >= INTERVAL ''7 days'') as is_reentry,
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


ALTER FUNCTION "public"."get_ranking_history"("p_user_id" "uuid", "p_item_id" "text", "p_item_type" "text", "p_time_range" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ranking_history"("p_user_id" "uuid", "p_entity_id" "text", "p_entity_type" "text", "p_time_range" "text", "p_limit" integer DEFAULT 100) RETURNS TABLE("snapshot_id" "uuid", "created_at" timestamp with time zone, "rank" integer, "previous_rank" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
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


ALTER FUNCTION "public"."get_ranking_history"("p_user_id" "uuid", "p_entity_id" "text", "p_entity_type" "text", "p_time_range" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sparkline_data"("p_user_id" "uuid", "p_item_ids" "text"[], "p_item_type" "text", "p_days" integer) RETURNS TABLE("item_id" "text", "date" timestamp with time zone, "rank" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
BEGIN
  RETURN QUERY
  EXECUTE format(
    'SELECT 
      r.%I as item_id,
      r.created_at as date,
      r.rank
    FROM %I r
    WHERE r.user_id = $1 
      AND r.%I = ANY($2)
      AND r.created_at >= NOW() - ($3 || '' days'')::INTERVAL
    ORDER BY r.%I, r.created_at ASC',
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


ALTER FUNCTION "public"."get_sparkline_data"("p_user_id" "uuid", "p_item_ids" "text"[], "p_item_type" "text", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sparkline_data"("p_user_id" "uuid", "p_entity_id" "text", "p_entity_type" "text", "p_time_range" "text", "p_limit" integer DEFAULT 30) RETURNS TABLE("created_at" timestamp with time zone, "rank" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
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


ALTER FUNCTION "public"."get_sparkline_data"("p_user_id" "uuid", "p_entity_id" "text", "p_entity_type" "text", "p_time_range" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_valid_spotify_user_id"("user_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN user_id IS NOT NULL 
    AND LENGTH(user_id) > 0 
    AND LENGTH(user_id) <= 255;
END;
$$;


ALTER FUNCTION "public"."is_valid_spotify_user_id"("user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_artist_listening_stats"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.artist_listening_stats (
    user_id,
    artist_id,
    artist_name,
    total_play_count,
    total_duration_ms,
    unique_tracks_count,
    first_tracked_at,
    last_tracked_at,
    updated_at
  )
  SELECT 
    tr.user_id,
    tr.artist_id,
    tr.artist_name,
    COUNT(*) as total_play_count,
    SUM(tr.duration_ms) as total_duration_ms,
    COUNT(DISTINCT tr.track_id) as unique_tracks_count,
    MIN(tr.created_at) as first_tracked_at,
    MAX(tr.created_at) as last_tracked_at,
    now() as updated_at
  FROM public.track_rankings tr
  GROUP BY tr.user_id, tr.artist_id, tr.artist_name
  ON CONFLICT (user_id, artist_id)
  DO UPDATE SET
    total_play_count = EXCLUDED.total_play_count,
    total_duration_ms = EXCLUDED.total_duration_ms,
    unique_tracks_count = EXCLUDED.unique_tracks_count,
    last_tracked_at = EXCLUDED.last_tracked_at,
    updated_at = now();
END;
$$;


ALTER FUNCTION "public"."update_artist_listening_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_artist_listening_stats"() IS 'Updates artist listening stats from track rankings data';



CREATE OR REPLACE FUNCTION "public"."update_spotify_connections_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_spotify_connections_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."album_rankings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "snapshot_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "album_id" "text" NOT NULL,
    "album_name" "text" NOT NULL,
    "album_image_url" "text",
    "artist_id" "text" NOT NULL,
    "artist_name" "text" NOT NULL,
    "release_date" "text",
    "total_tracks" integer,
    "track_count" integer DEFAULT 1 NOT NULL,
    "rank" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "previous_rank" integer,
    CONSTRAINT "album_rankings_rank_check" CHECK (("rank" >= 1))
)
WITH ("autovacuum_vacuum_scale_factor"='0.1', "autovacuum_analyze_scale_factor"='0.05');


ALTER TABLE "public"."album_rankings" OWNER TO "postgres";


COMMENT ON TABLE "public"."album_rankings" IS 'User album rankings derived from top tracks';



COMMENT ON COLUMN "public"."album_rankings"."previous_rank" IS 'Rank from previous snapshot in same time range (NULL if new entry)';



CREATE TABLE IF NOT EXISTS "public"."artist_listening_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "artist_id" "text" NOT NULL,
    "artist_name" "text" NOT NULL,
    "total_play_count" integer DEFAULT 0,
    "total_duration_ms" bigint DEFAULT 0,
    "total_hours_listened" numeric GENERATED ALWAYS AS ((("total_duration_ms")::numeric / (3600000)::numeric)) STORED,
    "unique_tracks_count" integer DEFAULT 0,
    "first_tracked_at" timestamp with time zone DEFAULT "now"(),
    "last_tracked_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."artist_listening_stats" OWNER TO "postgres";


COMMENT ON TABLE "public"."artist_listening_stats" IS 'Aggregated listening statistics for each artist per user';



CREATE TABLE IF NOT EXISTS "public"."artist_rankings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "snapshot_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "artist_id" "text" NOT NULL,
    "artist_name" "text" NOT NULL,
    "artist_image_url" "text",
    "genres" "text"[] DEFAULT '{}'::"text"[],
    "popularity" integer,
    "rank" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "previous_rank" integer,
    CONSTRAINT "artist_rankings_rank_check" CHECK ((("rank" >= 1) AND ("rank" <= 50)))
)
WITH ("autovacuum_vacuum_scale_factor"='0.1', "autovacuum_analyze_scale_factor"='0.05');


ALTER TABLE "public"."artist_rankings" OWNER TO "postgres";


COMMENT ON TABLE "public"."artist_rankings" IS 'User top artist rankings per snapshot';



COMMENT ON COLUMN "public"."artist_rankings"."previous_rank" IS 'Rank from previous snapshot in same time range (NULL if new entry)';



CREATE TABLE IF NOT EXISTS "public"."friendships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friend_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "friendships_no_self_friend" CHECK (("user_id" <> "friend_id")),
    CONSTRAINT "friendships_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."friendships" OWNER TO "postgres";


COMMENT ON TABLE "public"."friendships" IS 'Internal friendship/follow system replacing Spotify follow API';



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "spotify_user_id" "text",
    "display_name" "text" NOT NULL,
    "discriminator" "text" NOT NULL,
    "avatar_url" "text",
    "stats_visibility" "text" DEFAULT 'followers'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "spotify_user_name" "text",
    CONSTRAINT "user_profiles_discriminator_check" CHECK (("discriminator" ~ '^\d{4}$'::"text")),
    CONSTRAINT "user_profiles_stats_visibility_check" CHECK (("stats_visibility" = ANY (ARRAY['public'::"text", 'followers'::"text", 'private'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_profiles" IS 'Public user profiles with Discord-style usernames';



COMMENT ON COLUMN "public"."user_profiles"."spotify_user_id" IS 'Real Spotify user ID from API (e.g., "31l77fd3v4rxdm6ge23lfaoxxxx"). 
  Required for Spotify Follow API calls. Initially NULL, populated by auth callback via /me endpoint.';



COMMENT ON COLUMN "public"."user_profiles"."discriminator" IS 'Random 4-digit discriminator (like Discord)';



COMMENT ON COLUMN "public"."user_profiles"."stats_visibility" IS 'Who can view this users stats: public, followers (mutual follows), private';



COMMENT ON COLUMN "public"."user_profiles"."spotify_user_name" IS 'Spotify username/display ID (e.g., "ludwig100", "brkay536"). This is what appears in Spotify URLs and the sub claim in OAuth tokens.';



CREATE OR REPLACE VIEW "public"."profiles_needing_real_user_id" AS
 SELECT "id",
    "user_id",
    "display_name",
    "discriminator",
    "spotify_user_name",
    "spotify_user_id",
        CASE
            WHEN ("spotify_user_id" IS NULL) THEN 'Missing ID'::"text"
            WHEN (NOT "public"."is_valid_spotify_user_id"("spotify_user_id")) THEN 'Invalid ID (looks like username)'::"text"
            ELSE 'Valid ID'::"text"
        END AS "id_status",
    "created_at",
    "updated_at"
   FROM "public"."user_profiles"
  WHERE (("spotify_user_id" IS NULL) OR (NOT "public"."is_valid_spotify_user_id"("spotify_user_id")))
  ORDER BY "created_at" DESC;


ALTER VIEW "public"."profiles_needing_real_user_id" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "time_range" "text" NOT NULL,
    CONSTRAINT "snapshots_time_range_check" CHECK (("time_range" = ANY (ARRAY['short_term'::"text", 'medium_term'::"text", 'long_term'::"text"])))
)
WITH ("autovacuum_vacuum_scale_factor"='0.1', "autovacuum_analyze_scale_factor"='0.05');


ALTER TABLE "public"."snapshots" OWNER TO "postgres";


COMMENT ON TABLE "public"."snapshots" IS 'Tracks when Spotify stats were collected for each user';



COMMENT ON COLUMN "public"."snapshots"."time_range" IS 'Spotify API time range: short_term (4 weeks), medium_term (6 months), long_term (all time)';



CREATE TABLE IF NOT EXISTS "public"."spotify_connections" (
    "user_id" "uuid" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "scope_version" integer DEFAULT 1 NOT NULL,
    "status" "text" DEFAULT 'connected'::"text" NOT NULL,
    "connected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_sync_at" timestamp with time zone,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "spotify_connections_status_check" CHECK (("status" = ANY (ARRAY['connected'::"text", 'revoked'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."spotify_connections" OWNER TO "postgres";


COMMENT ON TABLE "public"."spotify_connections" IS 'Stores Spotify OAuth refresh tokens and connection state for cron jobs. Separates token management from auth.users.identities for operational reliability.';



COMMENT ON COLUMN "public"."spotify_connections"."scope_version" IS 'Version of OAuth scopes granted. Increment when requesting new scopes to track permission changes.';



COMMENT ON COLUMN "public"."spotify_connections"."status" IS 'Connection status: connected (active), revoked (user revoked access), error (temporary failure)';



CREATE TABLE IF NOT EXISTS "public"."track_rankings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "snapshot_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "track_id" "text" NOT NULL,
    "track_name" "text" NOT NULL,
    "track_image_url" "text",
    "artist_id" "text" NOT NULL,
    "artist_name" "text" NOT NULL,
    "album_id" "text" NOT NULL,
    "album_name" "text" NOT NULL,
    "duration_ms" integer,
    "popularity" integer,
    "rank" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "previous_rank" integer,
    CONSTRAINT "track_rankings_rank_check" CHECK ((("rank" >= 1) AND ("rank" <= 50)))
)
WITH ("autovacuum_vacuum_scale_factor"='0.1', "autovacuum_analyze_scale_factor"='0.05');


ALTER TABLE "public"."track_rankings" OWNER TO "postgres";


COMMENT ON TABLE "public"."track_rankings" IS 'User top track rankings per snapshot';



COMMENT ON COLUMN "public"."track_rankings"."previous_rank" IS 'Rank from previous snapshot in same time range (NULL if new entry)';



ALTER TABLE ONLY "public"."album_rankings"
    ADD CONSTRAINT "album_rankings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artist_listening_stats"
    ADD CONSTRAINT "artist_listening_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artist_listening_stats"
    ADD CONSTRAINT "artist_listening_stats_user_id_artist_id_key" UNIQUE ("user_id", "artist_id");



ALTER TABLE ONLY "public"."artist_rankings"
    ADD CONSTRAINT "artist_rankings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_unique" UNIQUE ("user_id", "friend_id");



ALTER TABLE ONLY "public"."snapshots"
    ADD CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spotify_connections"
    ADD CONSTRAINT "spotify_connections_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."track_rankings"
    ADD CONSTRAINT "track_rankings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "unique_display_name_discriminator" UNIQUE ("display_name", "discriminator");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "unique_user_id" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_spotify_user_id_key" UNIQUE ("spotify_user_id");



CREATE INDEX "idx_album_rankings_snapshot_id" ON "public"."album_rankings" USING "btree" ("snapshot_id");



CREATE INDEX "idx_album_rankings_user_id" ON "public"."album_rankings" USING "btree" ("user_id");



CREATE INDEX "idx_artist_listening_stats_user_artist" ON "public"."artist_listening_stats" USING "btree" ("user_id", "artist_id");



CREATE INDEX "idx_artist_rankings_history" ON "public"."artist_rankings" USING "btree" ("user_id", "artist_id", "created_at" DESC);



CREATE INDEX "idx_artist_rankings_snapshot_created" ON "public"."artist_rankings" USING "btree" ("snapshot_id", "created_at" DESC);



CREATE INDEX "idx_artist_rankings_snapshot_id" ON "public"."artist_rankings" USING "btree" ("snapshot_id");



CREATE INDEX "idx_artist_rankings_user_artist" ON "public"."artist_rankings" USING "btree" ("user_id", "artist_id");



CREATE INDEX "idx_artist_rankings_user_id" ON "public"."artist_rankings" USING "btree" ("user_id");



CREATE INDEX "idx_friendships_friend_status" ON "public"."friendships" USING "btree" ("friend_id", "status");



CREATE INDEX "idx_friendships_user_status" ON "public"."friendships" USING "btree" ("user_id", "status");



CREATE INDEX "idx_snapshots_created_at" ON "public"."snapshots" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_snapshots_user_id" ON "public"."snapshots" USING "btree" ("user_id");



CREATE INDEX "idx_snapshots_user_time_range" ON "public"."snapshots" USING "btree" ("user_id", "time_range");



CREATE INDEX "idx_spotify_connections_status" ON "public"."spotify_connections" USING "btree" ("status");



CREATE INDEX "idx_track_rankings_history" ON "public"."track_rankings" USING "btree" ("user_id", "track_id", "created_at" DESC);



CREATE INDEX "idx_track_rankings_snapshot_id" ON "public"."track_rankings" USING "btree" ("snapshot_id");



CREATE INDEX "idx_track_rankings_track_id" ON "public"."track_rankings" USING "btree" ("track_id");



CREATE INDEX "idx_track_rankings_user_id" ON "public"."track_rankings" USING "btree" ("user_id");



CREATE INDEX "idx_track_rankings_user_track" ON "public"."track_rankings" USING "btree" ("user_id", "track_id");



CREATE INDEX "idx_user_profiles_display_name_gin" ON "public"."user_profiles" USING "gin" ("display_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_user_profiles_user_id" ON "public"."user_profiles" USING "btree" ("user_id");



CREATE UNIQUE INDEX "snapshots_user_date_timerange_unique" ON "public"."snapshots" USING "btree" ("user_id", "time_range", "public"."get_date_only"("created_at"));



CREATE OR REPLACE TRIGGER "set_friendships_updated_at" BEFORE UPDATE ON "public"."friendships" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_spotify_connections_timestamp" BEFORE UPDATE ON "public"."spotify_connections" FOR EACH ROW EXECUTE FUNCTION "public"."update_spotify_connections_updated_at"();



ALTER TABLE ONLY "public"."album_rankings"
    ADD CONSTRAINT "album_rankings_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."album_rankings"
    ADD CONSTRAINT "album_rankings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artist_listening_stats"
    ADD CONSTRAINT "artist_listening_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artist_rankings"
    ADD CONSTRAINT "artist_rankings_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artist_rankings"
    ADD CONSTRAINT "artist_rankings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."snapshots"
    ADD CONSTRAINT "snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spotify_connections"
    ADD CONSTRAINT "spotify_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."track_rankings"
    ADD CONSTRAINT "track_rankings_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."track_rankings"
    ADD CONSTRAINT "track_rankings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Users can delete their own album rankings" ON "public"."album_rankings" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own artist rankings" ON "public"."artist_rankings" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own snapshots" ON "public"."snapshots" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own track rankings" ON "public"."track_rankings" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own spotify connection" ON "public"."spotify_connections" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert their own album rankings" ON "public"."album_rankings" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own artist rankings" ON "public"."artist_rankings" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own artist stats" ON "public"."artist_listening_stats" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."user_profiles" FOR INSERT WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert their own snapshots" ON "public"."snapshots" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own track rankings" ON "public"."track_rankings" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can read own spotify connection" ON "public"."spotify_connections" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can remove friendships" ON "public"."friendships" FOR DELETE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("friend_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can send friend requests" ON "public"."friendships" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update friendship status" ON "public"."friendships" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("friend_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("friend_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can update own spotify connection" ON "public"."spotify_connections" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own artist stats" ON "public"."artist_listening_stats" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."user_profiles" FOR UPDATE USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view all public profiles" ON "public"."user_profiles" FOR SELECT USING (true);



CREATE POLICY "Users can view their album rankings and friends' rankings" ON "public"."album_rankings" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("user_id" IN ( SELECT
        CASE
            WHEN ("f"."user_id" = ( SELECT "auth"."uid"() AS "uid")) THEN "f"."friend_id"
            ELSE "f"."user_id"
        END AS "user_id"
   FROM "public"."friendships" "f"
  WHERE ((("f"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("f"."friend_id" = ( SELECT "auth"."uid"() AS "uid"))) AND ("f"."status" = 'accepted'::"text"))))));



CREATE POLICY "Users can view their artist rankings and friends' rankings" ON "public"."artist_rankings" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("user_id" IN ( SELECT
        CASE
            WHEN ("f"."user_id" = ( SELECT "auth"."uid"() AS "uid")) THEN "f"."friend_id"
            ELSE "f"."user_id"
        END AS "user_id"
   FROM "public"."friendships" "f"
  WHERE ((("f"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("f"."friend_id" = ( SELECT "auth"."uid"() AS "uid"))) AND ("f"."status" = 'accepted'::"text"))))));



CREATE POLICY "Users can view their own artist stats" ON "public"."artist_listening_stats" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own friendships" ON "public"."friendships" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("friend_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can view their snapshots and friends' snapshots" ON "public"."snapshots" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("user_id" IN ( SELECT
        CASE
            WHEN ("f"."user_id" = ( SELECT "auth"."uid"() AS "uid")) THEN "f"."friend_id"
            ELSE "f"."user_id"
        END AS "user_id"
   FROM "public"."friendships" "f"
  WHERE ((("f"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("f"."friend_id" = ( SELECT "auth"."uid"() AS "uid"))) AND ("f"."status" = 'accepted'::"text"))))));



CREATE POLICY "Users can view their track rankings and friends' rankings" ON "public"."track_rankings" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("user_id" IN ( SELECT
        CASE
            WHEN ("f"."user_id" = ( SELECT "auth"."uid"() AS "uid")) THEN "f"."friend_id"
            ELSE "f"."user_id"
        END AS "user_id"
   FROM "public"."friendships" "f"
  WHERE ((("f"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("f"."friend_id" = ( SELECT "auth"."uid"() AS "uid"))) AND ("f"."status" = 'accepted'::"text"))))));



ALTER TABLE "public"."album_rankings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artist_listening_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artist_rankings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."friendships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spotify_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."track_rankings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";








GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."check_friendship_status"("p_user_id_1" "uuid", "p_user_id_2" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_friendship_status"("p_user_id_1" "uuid", "p_user_id_2" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_friendship_status"("p_user_id_1" "uuid", "p_user_id_2" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_profile_on_signup"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile_on_signup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile_on_signup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_account"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_account"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_account"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_data"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_data"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_data"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."export_user_data"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."export_user_data"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."export_user_data"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_discriminator"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_discriminator"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_discriminator"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_discriminator"("p_display_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_discriminator"("p_display_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_discriminator"("p_display_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_date_only"("timestamp_val" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_date_only"("timestamp_val" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_date_only"("timestamp_val" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_snapshot"("target_user_id" "uuid", "target_time_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_snapshot"("target_user_id" "uuid", "target_time_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_snapshot"("target_user_id" "uuid", "target_time_range" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ranking_history"("p_user_id" "uuid", "p_item_id" "text", "p_item_type" "text", "p_time_range" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_ranking_history"("p_user_id" "uuid", "p_item_id" "text", "p_item_type" "text", "p_time_range" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ranking_history"("p_user_id" "uuid", "p_item_id" "text", "p_item_type" "text", "p_time_range" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ranking_history"("p_user_id" "uuid", "p_entity_id" "text", "p_entity_type" "text", "p_time_range" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_ranking_history"("p_user_id" "uuid", "p_entity_id" "text", "p_entity_type" "text", "p_time_range" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ranking_history"("p_user_id" "uuid", "p_entity_id" "text", "p_entity_type" "text", "p_time_range" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sparkline_data"("p_user_id" "uuid", "p_item_ids" "text"[], "p_item_type" "text", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_sparkline_data"("p_user_id" "uuid", "p_item_ids" "text"[], "p_item_type" "text", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sparkline_data"("p_user_id" "uuid", "p_item_ids" "text"[], "p_item_type" "text", "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sparkline_data"("p_user_id" "uuid", "p_entity_id" "text", "p_entity_type" "text", "p_time_range" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_sparkline_data"("p_user_id" "uuid", "p_entity_id" "text", "p_entity_type" "text", "p_time_range" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sparkline_data"("p_user_id" "uuid", "p_entity_id" "text", "p_entity_type" "text", "p_time_range" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_valid_spotify_user_id"("user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_valid_spotify_user_id"("user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_valid_spotify_user_id"("user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_artist_listening_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_artist_listening_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_artist_listening_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_spotify_connections_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_spotify_connections_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_spotify_connections_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";
























GRANT ALL ON TABLE "public"."album_rankings" TO "anon";
GRANT ALL ON TABLE "public"."album_rankings" TO "authenticated";
GRANT ALL ON TABLE "public"."album_rankings" TO "service_role";



GRANT ALL ON TABLE "public"."artist_listening_stats" TO "anon";
GRANT ALL ON TABLE "public"."artist_listening_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."artist_listening_stats" TO "service_role";



GRANT ALL ON TABLE "public"."artist_rankings" TO "anon";
GRANT ALL ON TABLE "public"."artist_rankings" TO "authenticated";
GRANT ALL ON TABLE "public"."artist_rankings" TO "service_role";



GRANT ALL ON TABLE "public"."friendships" TO "anon";
GRANT ALL ON TABLE "public"."friendships" TO "authenticated";
GRANT ALL ON TABLE "public"."friendships" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."profiles_needing_real_user_id" TO "anon";
GRANT ALL ON TABLE "public"."profiles_needing_real_user_id" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles_needing_real_user_id" TO "service_role";



GRANT ALL ON TABLE "public"."snapshots" TO "anon";
GRANT ALL ON TABLE "public"."snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."spotify_connections" TO "anon";
GRANT ALL ON TABLE "public"."spotify_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."spotify_connections" TO "service_role";



GRANT ALL ON TABLE "public"."track_rankings" TO "anon";
GRANT ALL ON TABLE "public"."track_rankings" TO "authenticated";
GRANT ALL ON TABLE "public"."track_rankings" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































