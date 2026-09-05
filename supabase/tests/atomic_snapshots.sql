-- Disposable test database only. Every fixture is rolled back.
BEGIN;
SET LOCAL row_security = on;
CREATE FUNCTION pg_temp.assert_true(value boolean, message text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN
  IF value IS DISTINCT FROM true THEN RAISE EXCEPTION '%', message; END IF;
END $$;
CREATE FUNCTION pg_temp.reject_test_aggregate() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN
  IF NEW.user_id = '00000000-0000-0000-0000-000000000061' AND NEW.artist_id = 'reject-for-test' THEN
    RAISE EXCEPTION 'Synthetic aggregate failure' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reject_test_aggregate BEFORE INSERT OR UPDATE ON public.artist_listening_stats
  FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_test_aggregate();
INSERT INTO auth.users(id,email) VALUES
  ('00000000-0000-0000-0000-000000000061','snapshot-owner@example.invalid'),
  ('00000000-0000-0000-0000-000000000062','snapshot-other@example.invalid');
INSERT INTO public.snapshots(id,user_id,time_range,created_at) VALUES
  ('10000000-0000-0000-0000-000000000061','00000000-0000-0000-0000-000000000061','short_term',now()-interval '48 hours');
INSERT INTO public.artist_rankings(snapshot_id,user_id,artist_id,artist_name,rank) VALUES
  ('10000000-0000-0000-0000-000000000061','00000000-0000-0000-0000-000000000061','artist-a','Artist A',8);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000061"}',true);
DO $$
DECLARE first_result jsonb; retry_result jsonb;
BEGIN
  first_result := public.persist_snapshot('00000000-0000-0000-0000-000000000061','short_term',
    '[{"artist_id":"artist-a","artist_name":"Artist A","rank":2},{"artist_id":"artist-new","artist_name":"New","rank":1}]',
    '[{"track_id":"track-a","track_name":"Track A","artist_id":"artist-a","artist_name":"Artist A","album_id":"album-a","album_name":"Album A","rank":1}]',
    '[{"album_id":"album-a","album_name":"Album A","artist_id":"artist-a","artist_name":"Artist A","track_count":1,"rank":1}]');
  PERFORM pg_temp.assert_true(first_result->>'skipped'='false','first collection must persist');
  PERFORM pg_temp.assert_true((SELECT previous_rank=8 FROM public.artist_rankings WHERE snapshot_id=(first_result->>'snapshotId')::uuid AND artist_id='artist-a'),'previous rank comes from prior snapshot');
  PERFORM pg_temp.assert_true((SELECT previous_rank IS NULL FROM public.artist_rankings WHERE snapshot_id=(first_result->>'snapshotId')::uuid AND artist_id='artist-new'),'new item has no previous rank');
  PERFORM pg_temp.assert_true((SELECT total_play_count=1 FROM public.artist_listening_stats WHERE user_id='00000000-0000-0000-0000-000000000061' AND artist_id='artist-a'),'first collection includes aggregate transaction');
  UPDATE public.artist_listening_stats SET total_play_count=999 WHERE user_id='00000000-0000-0000-0000-000000000061';
  retry_result := public.persist_snapshot('00000000-0000-0000-0000-000000000061','short_term','[]','[]','[]');
  PERFORM pg_temp.assert_true(retry_result->>'skipped'='true' AND first_result->>'snapshotId'=retry_result->>'snapshotId','retry returns same completed snapshot');
  PERFORM pg_temp.assert_true((SELECT count(*)=2 FROM public.artist_rankings WHERE snapshot_id=(first_result->>'snapshotId')::uuid),'retry preserves original rankings');
  PERFORM pg_temp.assert_true((SELECT total_play_count=1 FROM public.artist_listening_stats WHERE user_id='00000000-0000-0000-0000-000000000061' AND artist_id='artist-a'),'skipped snapshot refreshes stale aggregate');

  BEGIN
    PERFORM public.persist_snapshot('00000000-0000-0000-0000-000000000061','long_term',
      '[{"artist_id":"artist-a","artist_name":"Artist A","rank":1}]',
      '[{"track_id":"invalid","rank":0}]','[]');
    RAISE EXCEPTION 'invalid track unexpectedly accepted';
  EXCEPTION WHEN not_null_violation OR check_violation THEN NULL;
  END;
  PERFORM pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.snapshots WHERE user_id='00000000-0000-0000-0000-000000000061' AND time_range='long_term'),'failed track insert rolls back snapshot and artists');
  PERFORM public.persist_snapshot('00000000-0000-0000-0000-000000000061','long_term','[]','[]','[]');
  PERFORM pg_temp.assert_true((SELECT count(*)=1 FROM public.snapshots WHERE user_id='00000000-0000-0000-0000-000000000061' AND time_range='long_term'),'retry after failure succeeds, including genuinely empty history');
  BEGIN
    PERFORM public.persist_snapshot('00000000-0000-0000-0000-000000000061','medium_term',
      '[{"artist_id":"reject-for-test","artist_name":"Rejected","rank":1}]',
      '[{"track_id":"rejected-track","track_name":"Rejected","artist_id":"reject-for-test","artist_name":"Rejected","album_id":"album-a","album_name":"Album A","rank":1}]',
      '[{"album_id":"album-a","album_name":"Album A","artist_id":"reject-for-test","artist_name":"Rejected","track_count":1,"rank":1}]');
    RAISE EXCEPTION 'aggregate failure unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  PERFORM pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.snapshots WHERE user_id='00000000-0000-0000-0000-000000000061' AND time_range='medium_term'),'aggregate failure rolls back parent snapshot');
  PERFORM pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.track_rankings WHERE user_id='00000000-0000-0000-0000-000000000061' AND track_id='rejected-track'),'aggregate failure rolls back prior ranking inserts');
  PERFORM public.persist_snapshot('00000000-0000-0000-0000-000000000061','medium_term','[]','[]','[]');
  PERFORM pg_temp.assert_true((SELECT count(*)=1 FROM public.snapshots WHERE user_id='00000000-0000-0000-0000-000000000061' AND time_range='medium_term'),'retry after aggregate failure succeeds');
  BEGIN
    PERFORM public.persist_snapshot('00000000-0000-0000-0000-000000000062','medium_term','[]','[]','[]');
    RAISE EXCEPTION 'cross-user persistence unexpectedly accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
SELECT pg_temp.assert_true(NOT has_function_privilege('anon','public.persist_snapshot(uuid,text,jsonb,jsonb,jsonb)','EXECUTE'),'anonymous cannot collect');
RESET ROLE;
SET LOCAL timezone='America/New_York';
SELECT pg_temp.assert_true(public.get_date_only('2026-03-08T00:30:00Z')='2026-03-08'::date,'UTC date independent of session timezone');
INSERT INTO public.snapshots(user_id,time_range,created_at) VALUES
  ('00000000-0000-0000-0000-000000000062','short_term','2026-03-08T00:00:00Z');
DO $$ BEGIN
  BEGIN
    INSERT INTO public.snapshots(user_id,time_range,created_at) VALUES
      ('00000000-0000-0000-0000-000000000062','short_term','2026-03-08T23:59:59.999999Z');
    RAISE EXCEPTION 'duplicate UTC day accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;
INSERT INTO public.snapshots(user_id,time_range,created_at) VALUES
  ('00000000-0000-0000-0000-000000000062','short_term','2026-03-09T00:00:00Z');
ROLLBACK;
