-- Run against a disposable Supabase database after schema.sql and new migrations.
-- Everything, including synthetic users, is rolled back on success.
BEGIN;
SET LOCAL timezone = 'UTC';
SET LOCAL row_security = on;

CREATE FUNCTION pg_temp.assert_true(ok boolean, message text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', message; END IF;
END $$;
CREATE FUNCTION pg_temp.expect_error(statement text, expected_state text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE actual_state text;
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS actual_state = RETURNED_SQLSTATE;
    IF actual_state = expected_state THEN RETURN; END IF;
    RAISE EXCEPTION 'Wrong SQLSTATE %, expected % for %', actual_state, expected_state, statement;
  END;
  RAISE EXCEPTION 'Expected SQLSTATE % for %', expected_state, statement;
END $$;

INSERT INTO auth.users (id, email, raw_user_meta_data)
SELECT ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'audit-' || n || '@example.invalid', '{"display_name":"Audit"}'::jsonb
FROM generate_series(1, 5) n;
INSERT INTO public.user_profiles (user_id, display_name, discriminator, stats_visibility)
SELECT ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'Audit', lpad(n::text, 4, '0'), 'private'
FROM generate_series(1, 5) n
ON CONFLICT (user_id) DO UPDATE SET stats_visibility = 'private';
INSERT INTO public.snapshots (id, user_id, time_range, created_at)
SELECT ('10000000-0000-0000-0000-00000000000' || n)::uuid, ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'short_term', now()
FROM generate_series(1, 5) n;
INSERT INTO public.artist_rankings (snapshot_id, user_id, artist_id, artist_name, rank)
SELECT id, user_id, 'artist', 'Artist', 1 FROM public.snapshots WHERE id::text LIKE '10000000-%';
INSERT INTO public.track_rankings (snapshot_id, user_id, track_id, track_name, artist_id, artist_name, album_id, album_name, duration_ms, rank)
SELECT id, user_id, 'track', 'Track', 'artist', 'Artist', 'album', 'Album', 180000, 1 FROM public.snapshots WHERE id::text LIKE '10000000-%';
INSERT INTO public.album_rankings (snapshot_id, user_id, album_id, album_name, artist_id, artist_name, rank)
SELECT id, user_id, 'album', 'Album', 'artist', 'Artist', 1 FROM public.snapshots WHERE id::text LIKE '10000000-%';
INSERT INTO public.artist_listening_stats (user_id, artist_id, artist_name, total_play_count)
SELECT ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'artist', 'Artist', 999 FROM generate_series(1, 5) n;
INSERT INTO public.spotify_connections (user_id, refresh_token)
SELECT ('00000000-0000-0000-0000-00000000000' || n)::uuid, 'synthetic-secret' FROM generate_series(1, 5) n;
INSERT INTO public.friendships (id, user_id, friend_id, status) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'pending'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'pending'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'pending'),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', 'pending');

DO $$ DECLARE relation text; viewer text; BEGIN
  FOREACH relation IN ARRAY ARRAY['snapshots','artist_rankings','track_rankings','album_rankings','artist_listening_stats','user_profiles','spotify_connections','friendships'] LOOP
    FOREACH viewer IN ARRAY ARRAY['anon','authenticated'] LOOP
      PERFORM pg_temp.assert_true(NOT has_table_privilege(viewer,'public.' || relation,'TRUNCATE'), viewer || ' cannot truncate ' || relation);
      PERFORM pg_temp.assert_true(NOT has_table_privilege(viewer,'public.' || relation,'TRIGGER'), viewer || ' cannot attach triggers to ' || relation);
    END LOOP;
  END LOOP;
END $$;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT pg_temp.expect_error($q$SELECT public.export_user_data('00000000-0000-0000-0000-000000000001')$q$, '42501');
SELECT pg_temp.expect_error($q$SELECT public.delete_user_data('00000000-0000-0000-0000-000000000001')$q$, '42501');
SELECT pg_temp.expect_error($q$SELECT public.delete_user_account('00000000-0000-0000-0000-000000000001')$q$, '42501');
SELECT pg_temp.expect_error($q$SELECT public.update_artist_listening_stats()$q$, '42501');
SELECT pg_temp.expect_error('TRUNCATE public.friendships', '42501');
SELECT pg_temp.expect_error('SELECT refresh_token FROM public.spotify_connections', '42501');
SELECT pg_temp.expect_error($q$SELECT public.refresh_artist_listening_stats_for_user('00000000-0000-0000-0000-000000000001')$q$, '42501');

-- Test the function guards as authenticated with a missing subject as well as
-- the anonymous grants. SQL NULL must never fall through authorization.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated"}', true);
SELECT pg_temp.expect_error($q$SELECT public.export_user_data('00000000-0000-0000-0000-000000000001')$q$, '42501');
SELECT pg_temp.expect_error($q$SELECT public.delete_user_data('00000000-0000-0000-0000-000000000001')$q$, '42501');
SELECT pg_temp.expect_error($q$SELECT public.delete_user_account('00000000-0000-0000-0000-000000000001')$q$, '42501');
SELECT pg_temp.expect_error($q$SELECT public.update_artist_listening_stats()$q$, '42501');
SELECT pg_temp.expect_error('TRUNCATE public.friendships', '42501');
SELECT pg_temp.expect_error('SELECT refresh_token FROM public.spotify_connections', '42501');
SELECT pg_temp.expect_error($q$SELECT public.refresh_artist_listening_stats_for_user('00000000-0000-0000-0000-000000000001')$q$, '42501');

SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000003"}', true);
SELECT pg_temp.expect_error($q$SELECT public.export_user_data('00000000-0000-0000-0000-000000000001')$q$, '42501');
SELECT pg_temp.expect_error($q$SELECT public.delete_user_data('00000000-0000-0000-0000-000000000001')$q$, '42501');
SELECT pg_temp.expect_error($q$SELECT public.delete_user_account('00000000-0000-0000-0000-000000000001')$q$, '42501');
SELECT pg_temp.expect_error($q$SELECT public.export_user_data(NULL)$q$, '42501');
SELECT pg_temp.expect_error($q$SELECT public.refresh_artist_listening_stats_for_user('00000000-0000-0000-0000-000000000001')$q$, '42501');
SELECT pg_temp.expect_error($q$SELECT public.refresh_artist_listening_stats_for_user(NULL)$q$, '42501');
SELECT pg_temp.expect_error($q$INSERT INTO public.user_profiles (id,user_id,display_name,discriminator) VALUES ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Hijacked','9999')$q$, '42501');

-- The requester cannot fabricate acceptance or transplant a friendship.
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}', true);
SELECT pg_temp.expect_error($q$INSERT INTO public.friendships(user_id, friend_id, status) VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','accepted')$q$, '42501');
SELECT pg_temp.expect_error($q$UPDATE public.friendships SET status='accepted' WHERE id='20000000-0000-0000-0000-000000000001'$q$, '42501');
SELECT pg_temp.expect_error($q$UPDATE public.friendships SET friend_id='00000000-0000-0000-0000-000000000003' WHERE id='20000000-0000-0000-0000-000000000001'$q$, '42501');
SELECT pg_temp.expect_error($q$UPDATE public.friendships SET user_id=friend_id, friend_id=user_id, status='accepted' WHERE id='20000000-0000-0000-0000-000000000001'$q$, '42501');

SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000002"}', true);
UPDATE public.friendships SET status='accepted' WHERE id='20000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_true((SELECT status='accepted' FROM public.friendships WHERE id='20000000-0000-0000-0000-000000000001'), 'recipient accepts');
SELECT pg_temp.expect_error($q$UPDATE public.friendships SET status='pending' WHERE id='20000000-0000-0000-0000-000000000001'$q$, '42501');
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000003"}', true);
SELECT pg_temp.assert_true(NOT public.check_friendship_status('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'), 'unrelated user cannot enumerate friendships');

-- Test every table and every stats RPC for each privacy setting and viewer.
RESET ROLE;
DO $$
DECLARE visibility text; viewer integer; allowed boolean; relation text; statement text; row_count integer;
BEGIN
  FOREACH visibility IN ARRAY ARRAY['private', 'followers', 'public'] LOOP
    UPDATE public.user_profiles SET stats_visibility=visibility WHERE user_id='00000000-0000-0000-0000-000000000001';
    FOR viewer IN 0..4 LOOP
      allowed := viewer=1 OR visibility='public' OR (visibility='followers' AND viewer=2);
      IF viewer=0 THEN
        PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
        EXECUTE 'SET LOCAL ROLE anon';
      ELSE
        PERFORM set_config('request.jwt.claims', jsonb_build_object('role','authenticated','sub','00000000-0000-0000-0000-00000000000' || viewer)::text, true);
        EXECUTE 'SET LOCAL ROLE authenticated';
      END IF;
      FOREACH relation IN ARRAY ARRAY['snapshots','artist_rankings','track_rankings','album_rankings','artist_listening_stats'] LOOP
        EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id=%L', relation, '00000000-0000-0000-0000-000000000001') INTO row_count;
        PERFORM pg_temp.assert_true(row_count = CASE WHEN allowed THEN 1 ELSE 0 END, relation || ' visibility=' || visibility || ' viewer=' || viewer);
      END LOOP;
      FOREACH statement IN ARRAY ARRAY[
        $q$SELECT public.get_latest_snapshot('00000000-0000-0000-0000-000000000001','short_term')$q$,
        $q$SELECT public.get_ranking_history(p_user_id=>'00000000-0000-0000-0000-000000000001',p_item_id=>'artist',p_item_type=>'artist',p_time_range=>'short_term')$q$,
        $q$SELECT public.get_ranking_history('00000000-0000-0000-0000-000000000001','track','track','short_term',10)$q$,
        $q$SELECT public.get_sparkline_data('00000000-0000-0000-0000-000000000001',ARRAY['album'],'album',30)$q$,
        $q$SELECT public.get_sparkline_data('00000000-0000-0000-0000-000000000001','album','album','short_term',10)$q$,
        $q$SELECT public.get_album_takeover_recap('00000000-0000-0000-0000-000000000001',90)$q$,
        $q$SELECT public.get_hall_of_fame_recap('00000000-0000-0000-0000-000000000001',365,10)$q$,
        $q$SELECT public.get_plot_twists_recap('00000000-0000-0000-0000-000000000001',30,20)$q$,
        $q$SELECT public.get_three_versions_of_you('00000000-0000-0000-0000-000000000001',10)$q$
      ] LOOP
        IF allowed THEN EXECUTE statement; ELSE PERFORM pg_temp.expect_error(statement, '42501'); END IF;
      END LOOP;
      EXECUTE 'RESET ROLE';
    END LOOP;
  END LOOP;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}', true);
UPDATE public.user_profiles SET display_name='Updated by owner' WHERE user_id='00000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_true((SELECT display_name='Updated by owner' FROM public.user_profiles WHERE user_id='00000000-0000-0000-0000-000000000001'), 'profile ownership uses user_id, independent of primary id');
SELECT pg_temp.expect_error($q$UPDATE public.user_profiles SET user_id='00000000-0000-0000-0000-000000000003' WHERE user_id='00000000-0000-0000-0000-000000000001'$q$, '42501');
SELECT pg_temp.expect_error($q$INSERT INTO public.artist_rankings(snapshot_id,user_id,artist_id,artist_name,rank) VALUES ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','inject','Injection',2)$q$, '23503');
SELECT pg_temp.expect_error($q$INSERT INTO public.track_rankings(snapshot_id,user_id,track_id,track_name,artist_id,artist_name,album_id,album_name,rank) VALUES ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','inject','Injection','artist','Artist','album','Album',2)$q$, '23503');
SELECT pg_temp.expect_error($q$INSERT INTO public.album_rankings(snapshot_id,user_id,album_id,album_name,artist_id,artist_name,rank) VALUES ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','inject','Injection','artist','Artist',2)$q$, '23503');
SELECT public.update_artist_listening_stats();
SELECT pg_temp.assert_true((SELECT total_play_count=1 FROM public.artist_listening_stats WHERE user_id='00000000-0000-0000-0000-000000000001'), 'aggregate updates own rows');
RESET ROLE;
SELECT pg_temp.assert_true((SELECT total_play_count=999 FROM public.artist_listening_stats WHERE user_id='00000000-0000-0000-0000-000000000002'), 'aggregate does not update another user');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}', true);
DO $$ DECLARE exported jsonb; BEGIN
  exported := public.export_user_data('00000000-0000-0000-0000-000000000001');
  PERFORM pg_temp.assert_true(exported->'profile'->>'user_id'='00000000-0000-0000-0000-000000000001', 'export profile');
  PERFORM pg_temp.assert_true(jsonb_array_length(exported->'snapshots')=1 AND jsonb_array_length(exported->'artist_rankings')=1 AND jsonb_array_length(exported->'track_rankings')=1 AND jsonb_array_length(exported->'album_rankings')=1 AND jsonb_array_length(exported->'artist_listening_stats')=1, 'export all listening tables');
  PERFORM pg_temp.assert_true(jsonb_array_length(exported->'friendships')=2, 'export incoming and outgoing friendships');
  PERFORM pg_temp.assert_true(exported->'spotify_connection'->>'status'='connected' AND NOT (exported->'spotify_connection' ? 'refresh_token'), 'export connection without secret');
END $$;
SELECT public.delete_user_data('00000000-0000-0000-0000-000000000001');
SELECT public.delete_user_data('00000000-0000-0000-0000-000000000001');
RESET ROLE;
DO $$ DECLARE relation text; remaining integer; BEGIN
  FOREACH relation IN ARRAY ARRAY['snapshots','artist_rankings','track_rankings','album_rankings','artist_listening_stats'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id=%L',relation,'00000000-0000-0000-0000-000000000001') INTO remaining;
    PERFORM pg_temp.assert_true(remaining=0,'delete data clears ' || relation);
  END LOOP;
END $$;
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id='00000000-0000-0000-0000-000000000001') AND EXISTS(SELECT 1 FROM public.spotify_connections WHERE user_id='00000000-0000-0000-0000-000000000001') AND EXISTS(SELECT 1 FROM public.friendships WHERE user_id='00000000-0000-0000-0000-000000000001'), 'delete data retains account and connection');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000005"}', true);
SELECT public.delete_user_account('00000000-0000-0000-0000-000000000005');
RESET ROLE;
DO $$ DECLARE relation text; remaining integer; BEGIN
  FOREACH relation IN ARRAY ARRAY['snapshots','artist_rankings','track_rankings','album_rankings','artist_listening_stats','user_profiles','spotify_connections','friendships'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id=%L',relation,'00000000-0000-0000-0000-000000000005') INTO remaining;
    PERFORM pg_temp.assert_true(remaining=0,'delete account clears ' || relation);
  END LOOP;
END $$;
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM auth.users WHERE id='00000000-0000-0000-0000-000000000005'), 'account removed from auth');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.friendships WHERE friend_id='00000000-0000-0000-0000-000000000005'), 'account removal clears incoming friendships');
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM public.snapshots WHERE user_id='00000000-0000-0000-0000-000000000002'), 'other accounts retain history');

-- Historical dates belong to the snapshot, and reentry means missing an actual
-- intervening snapshot, even when that gap lasts less than seven days.
INSERT INTO public.snapshots (id,user_id,time_range,created_at) VALUES
  ('10000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000002','medium_term',now()-interval '20 days'),
  ('10000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000002','medium_term',now()-interval '10 days'),
  ('10000000-0000-0000-0000-000000000032','00000000-0000-0000-0000-000000000002','medium_term',now()-interval '9 days'),
  ('10000000-0000-0000-0000-000000000042','00000000-0000-0000-0000-000000000002','medium_term',now()-interval '8 days');
INSERT INTO public.artist_rankings (snapshot_id,user_id,artist_id,artist_name,rank)
SELECT id,user_id,'returning','Returning artist',2 FROM public.snapshots
WHERE id IN ('10000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000022','10000000-0000-0000-0000-000000000042');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000002"}', true);
DO $$ DECLARE entries jsonb; BEGIN
  SELECT jsonb_agg(to_jsonb(h) ORDER BY h.date) INTO entries
  FROM public.get_ranking_history(p_user_id=>'00000000-0000-0000-0000-000000000002',p_item_id=>'returning',p_item_type=>'artist',p_time_range=>'medium_term') h;
  PERFORM pg_temp.assert_true(jsonb_array_length(entries)=3, 'history returns three appearances');
  PERFORM pg_temp.assert_true((entries->0->>'is_new_entry')::boolean AND NOT (entries->1->>'is_new_entry')::boolean, 'new entry only first appearance');
  PERFORM pg_temp.assert_true(NOT (entries->1->>'is_reentry')::boolean, 'ten days between adjacent snapshots is not reentry');
  PERFORM pg_temp.assert_true((entries->2->>'is_reentry')::boolean, 'absence from intervening snapshot is reentry');
  PERFORM pg_temp.assert_true((entries->0->>'date')::timestamptz=now()-interval '20 days', 'history uses snapshot timestamp');
  PERFORM pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.get_ranking_history(p_user_id=>'00000000-0000-0000-0000-000000000002',p_item_id=>'missing',p_item_type=>'artist',p_time_range=>'medium_term')), 'unknown item has empty history');
END $$;

-- A signup trigger installed by an existing auth schema must reference the
-- current profile columns. Use a temporary trigger to exercise it in isolation.
RESET ROLE;
DELETE FROM public.user_profiles WHERE user_id='00000000-0000-0000-0000-000000000004';
CREATE TEMP TABLE signup_test (id uuid, raw_user_meta_data jsonb);
CREATE TRIGGER signup_test AFTER INSERT ON signup_test FOR EACH ROW EXECUTE FUNCTION public.create_user_profile_on_signup();
INSERT INTO signup_test VALUES ('00000000-0000-0000-0000-000000000004','{"display_name":"New signup"}');
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id='00000000-0000-0000-0000-000000000004' AND display_name='New signup'), 'signup function creates valid profile');

INSERT INTO public.track_rankings (snapshot_id,user_id,track_id,track_name,artist_id,artist_name,album_id,album_name,duration_ms,rank,created_at)
VALUES ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','track-two','Second track','artist','Renamed artist','album','Album',NULL,2,now()+interval '1 second');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000002"}', true);
SELECT public.update_artist_listening_stats();
SELECT pg_temp.assert_true((SELECT total_play_count=2 AND total_duration_ms=180000 AND artist_name='Renamed artist' FROM public.artist_listening_stats WHERE user_id='00000000-0000-0000-0000-000000000002'), 'renamed artist aggregates once with latest name and nullable duration');

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM public.spotify_connections WHERE user_id='00000000-0000-0000-0000-000000000002'), 'server retains connection access');
SELECT public.update_artist_listening_stats();
SELECT pg_temp.assert_true((SELECT total_play_count=1 FROM public.artist_listening_stats WHERE user_id='00000000-0000-0000-0000-000000000003'), 'service role can update aggregates globally');
RESET ROLE;
INSERT INTO public.artist_listening_stats(user_id,artist_id,artist_name) VALUES ('00000000-0000-0000-0000-000000000002','stale','Stale');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000002"}', true);
SELECT public.refresh_artist_listening_stats_for_user('00000000-0000-0000-0000-000000000002');
SELECT pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.artist_listening_stats WHERE user_id='00000000-0000-0000-0000-000000000002' AND artist_id='stale'), 'scoped refresh removes stale aggregates');
ROLLBACK;
