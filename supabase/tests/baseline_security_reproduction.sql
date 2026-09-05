-- Run ONLY on a disposable database loaded from the original checked-in schema,
-- BEFORE applying 20260905 migrations. This proves the former exploit paths.
-- All synthetic records and test mutations are rolled back.
BEGIN;
SET LOCAL row_security = on;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000091', 'audit-victim@example.invalid'),
  ('00000000-0000-0000-0000-000000000092', 'audit-attacker@example.invalid');
INSERT INTO public.user_profiles (user_id, display_name, discriminator, stats_visibility) VALUES
  ('00000000-0000-0000-0000-000000000091','Victim','0091','private'),
  ('00000000-0000-0000-0000-000000000092','Attacker','0092','private');
INSERT INTO public.snapshots(id,user_id,time_range) VALUES
  ('10000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000091','short_term');
INSERT INTO public.friendships(id,user_id,friend_id,status) VALUES
  ('20000000-0000-0000-0000-000000000091','00000000-0000-0000-0000-000000000092','00000000-0000-0000-0000-000000000091','pending');
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
DO $$ BEGIN
  IF jsonb_array_length(public.export_user_data('00000000-0000-0000-0000-000000000091')->'snapshots') <> 1 THEN
    RAISE EXCEPTION 'Expected original anonymous export vulnerability';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.get_latest_snapshot('00000000-0000-0000-0000-000000000091','short_term')) THEN
    RAISE EXCEPTION 'Expected original private snapshot RPC leak';
  END IF;
  IF NOT has_table_privilege('anon','public.friendships','TRUNCATE') THEN
    RAISE EXCEPTION 'Expected original anonymous TRUNCATE privilege';
  END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000092"}',true);
UPDATE public.friendships SET status='accepted' WHERE id='20000000-0000-0000-0000-000000000091';
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.snapshots WHERE user_id='00000000-0000-0000-0000-000000000091') THEN
    RAISE EXCEPTION 'Expected requester acceptance to bypass private stats';
  END IF;
END $$;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
SELECT public.delete_user_data('00000000-0000-0000-0000-000000000091');
SELECT public.delete_user_account('00000000-0000-0000-0000-000000000091');
RESET ROLE;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM auth.users WHERE id='00000000-0000-0000-0000-000000000091') THEN
    RAISE EXCEPTION 'Expected anonymous account deletion to succeed in old schema';
  END IF;
END $$;
ROLLBACK;
