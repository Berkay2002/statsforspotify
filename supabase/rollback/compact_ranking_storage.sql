-- Restore original tables from CURRENT data, including writes since migration.
-- Rehearse locally; apply only in the same maintenance window as the forward change.
BEGIN;
SET LOCAL lock_timeout='10s'; SET LOCAL statement_timeout='180s';
SELECT pg_advisory_xact_lock(hashtextextended('statsforspotify:maintenance-release',0));
LOCK TABLE public.snapshots IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE ranking_storage.album_observations, ranking_storage.artist_observations,
  ranking_storage.track_observations IN ACCESS EXCLUSIVE MODE;


-- The original table is an empty definition template; never overwrite old data.
DO $$ BEGIN IF EXISTS(SELECT 1 FROM ranking_storage_backup.artist_rankings) THEN
 RAISE EXCEPTION 'Rollback template artist_rankings is not empty'; END IF; END $$;
INSERT INTO ranking_storage_backup.artist_rankings SELECT * FROM public.artist_rankings;
DO $$ BEGIN IF EXISTS((SELECT * FROM ranking_storage_backup.artist_rankings EXCEPT ALL SELECT * FROM public.artist_rankings)
 UNION ALL (SELECT * FROM public.artist_rankings EXCEPT ALL SELECT * FROM ranking_storage_backup.artist_rankings))
 THEN RAISE EXCEPTION 'Rollback reconstruction failed: artist_rankings'; END IF; END $$;
DROP VIEW public.artist_rankings;
ALTER TABLE ranking_storage_backup.artist_rankings SET SCHEMA public;
DROP TABLE ranking_storage.artist_observations;
DROP TABLE ranking_storage.artist_metadata;
DROP FUNCTION ranking_storage.write_artist();
DROP FUNCTION ranking_storage.prune_artist();
DROP FUNCTION ranking_storage.artist_fingerprint;


-- The original table is an empty definition template; never overwrite old data.
DO $$ BEGIN IF EXISTS(SELECT 1 FROM ranking_storage_backup.track_rankings) THEN
 RAISE EXCEPTION 'Rollback template track_rankings is not empty'; END IF; END $$;
INSERT INTO ranking_storage_backup.track_rankings SELECT * FROM public.track_rankings;
DO $$ BEGIN IF EXISTS((SELECT * FROM ranking_storage_backup.track_rankings EXCEPT ALL SELECT * FROM public.track_rankings)
 UNION ALL (SELECT * FROM public.track_rankings EXCEPT ALL SELECT * FROM ranking_storage_backup.track_rankings))
 THEN RAISE EXCEPTION 'Rollback reconstruction failed: track_rankings'; END IF; END $$;
DROP VIEW public.track_rankings;
ALTER TABLE ranking_storage_backup.track_rankings SET SCHEMA public;
DROP TABLE ranking_storage.track_observations;
DROP TABLE ranking_storage.track_metadata;
DROP FUNCTION ranking_storage.write_track();
DROP FUNCTION ranking_storage.prune_track();
DROP FUNCTION ranking_storage.track_fingerprint;


-- The original table is an empty definition template; never overwrite old data.
DO $$ BEGIN IF EXISTS(SELECT 1 FROM ranking_storage_backup.album_rankings) THEN
 RAISE EXCEPTION 'Rollback template album_rankings is not empty'; END IF; END $$;
INSERT INTO ranking_storage_backup.album_rankings SELECT * FROM public.album_rankings;
DO $$ BEGIN IF EXISTS((SELECT * FROM ranking_storage_backup.album_rankings EXCEPT ALL SELECT * FROM public.album_rankings)
 UNION ALL (SELECT * FROM public.album_rankings EXCEPT ALL SELECT * FROM ranking_storage_backup.album_rankings))
 THEN RAISE EXCEPTION 'Rollback reconstruction failed: album_rankings'; END IF; END $$;
DROP VIEW public.album_rankings;
ALTER TABLE ranking_storage_backup.album_rankings SET SCHEMA public;
DROP TABLE ranking_storage.album_observations;
DROP TABLE ranking_storage.album_metadata;
DROP FUNCTION ranking_storage.write_album();
DROP FUNCTION ranking_storage.prune_album();
DROP FUNCTION ranking_storage.album_fingerprint;


DROP FUNCTION ranking_storage.lock_write(uuid[],uuid[]);
DROP FUNCTION ranking_storage.caller_bypasses_rls();
DROP SCHEMA ranking_storage;
DROP SCHEMA ranking_storage_backup;
ANALYZE public.album_rankings; ANALYZE public.artist_rankings; ANALYZE public.track_rankings;
NOTIFY pgrst,'reload schema';
COMMIT;
