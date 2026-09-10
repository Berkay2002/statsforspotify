-- Run only against the verified compact schema. Every fixture rolls back.
BEGIN;
SET LOCAL statement_timeout='30s';
DO $$ DECLARE owner_id uuid; snapshot_id uuid; BEGIN
 SELECT id INTO STRICT owner_id FROM auth.users ORDER BY id LIMIT 1;
 INSERT INTO public.snapshots(user_id,time_range,created_at)
 VALUES(owner_id,'short_term','2190-01-01T12:00:00Z') RETURNING id INTO snapshot_id;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 PERFORM set_config('ranking_smoke.snapshot',snapshot_id::text,true);
END $$;
SET LOCAL ROLE authenticated;
INSERT INTO public.artist_rankings(snapshot_id,user_id,artist_id,artist_name,rank)
 VALUES(current_setting('ranking_smoke.snapshot')::uuid,auth.uid(),'__release_smoke__','Release smoke fixture',1);
INSERT INTO public.track_rankings(snapshot_id,user_id,track_id,track_name,artist_id,artist_name,album_id,album_name,rank)
 VALUES(current_setting('ranking_smoke.snapshot')::uuid,auth.uid(),'__release_smoke__','Release smoke fixture','__release_smoke__','Release smoke fixture','__release_smoke__','Release smoke fixture',1);
INSERT INTO public.album_rankings(snapshot_id,user_id,album_id,album_name,artist_id,artist_name,rank)
 VALUES(current_setting('ranking_smoke.snapshot')::uuid,auth.uid(),'__release_smoke__','Release smoke fixture','__release_smoke__','Release smoke fixture',1);
DO $$ DECLARE affected bigint; BEGIN
 IF (SELECT count(*) FROM public.artist_rankings WHERE snapshot_id=current_setting('ranking_smoke.snapshot')::uuid)<>1
  OR (SELECT count(*) FROM public.track_rankings WHERE snapshot_id=current_setting('ranking_smoke.snapshot')::uuid)<>1
  OR (SELECT count(*) FROM public.album_rankings WHERE snapshot_id=current_setting('ranking_smoke.snapshot')::uuid)<>1
 THEN RAISE EXCEPTION 'Owner insert/read failed'; END IF;
 UPDATE public.artist_rankings SET rank=2 WHERE snapshot_id=current_setting('ranking_smoke.snapshot')::uuid;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'Unexpected authenticated UPDATE permission'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 PERFORM set_config('request.jwt.claim.sub','',true);
 IF EXISTS(SELECT 1 FROM public.artist_rankings WHERE snapshot_id=current_setting('ranking_smoke.snapshot')::uuid)
  OR EXISTS(SELECT 1 FROM public.track_rankings WHERE snapshot_id=current_setting('ranking_smoke.snapshot')::uuid)
  OR EXISTS(SELECT 1 FROM public.album_rankings WHERE snapshot_id=current_setting('ranking_smoke.snapshot')::uuid)
 THEN RAISE EXCEPTION 'Anonymous ranking visibility changed'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE public.artist_rankings SET artist_name='Updated release fixture' WHERE snapshot_id=current_setting('ranking_smoke.snapshot')::uuid;
DELETE FROM public.snapshots WHERE id=current_setting('ranking_smoke.snapshot')::uuid;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.artist_rankings WHERE snapshot_id=current_setting('ranking_smoke.snapshot')::uuid)
  OR EXISTS(SELECT 1 FROM public.track_rankings WHERE snapshot_id=current_setting('ranking_smoke.snapshot')::uuid)
  OR EXISTS(SELECT 1 FROM public.album_rankings WHERE snapshot_id=current_setting('ranking_smoke.snapshot')::uuid)
 THEN RAISE EXCEPTION 'Snapshot cascade failed'; END IF;
END $$;
ROLLBACK;
