-- Run after the friend_history_privacy migration as a database administrator.
-- Required session settings: stats.test.owner_id and stats.test.viewer_id,
-- referencing two existing auth users with user_profiles rows. Prefer dedicated
-- test users. This suite rolls back all fixture, privacy and friendship changes.
-- Existing users are required because the legacy signup trigger does not match
-- the current profile schema; this test intentionally does not alter that trigger.
begin;

do $$
declare
  owner_id uuid := current_setting('stats.test.owner_id')::uuid;
  viewer_id uuid := current_setting('stats.test.viewer_id')::uuid;
  snapshot_id uuid := gen_random_uuid();
begin
  if owner_id = viewer_id or
     (select count(*) from public.user_profiles where user_id in (owner_id, viewer_id)) <> 2 then
    raise exception 'Provide two distinct existing fixture users';
  end if;
  perform set_config('stats.test.snapshot_id', snapshot_id::text, true);
  perform set_config('stats.test.item_id', 'privacy-fixture-' || snapshot_id::text, true);
  perform set_config('stats.test.checks', '0', true);

  -- A future snapshot avoids colliding with normal daily snapshots and makes
  -- get_latest_snapshot deterministic. Nothing is visible outside this transaction.
  insert into public.snapshots (id, user_id, time_range, created_at)
  values (snapshot_id, owner_id, 'medium_term', '2200-01-01T00:00:00Z');
  insert into public.artist_rankings (snapshot_id, user_id, artist_id, artist_name, rank)
  values (snapshot_id, owner_id, current_setting('stats.test.item_id'), 'Privacy fixture', 1);
  insert into public.track_rankings (snapshot_id, user_id, track_id, track_name, artist_id, artist_name, album_id, album_name, rank)
  values (snapshot_id, owner_id, current_setting('stats.test.item_id'), 'Privacy fixture', current_setting('stats.test.item_id'), 'Privacy fixture', current_setting('stats.test.item_id'), 'Privacy fixture', 1);
  insert into public.album_rankings (snapshot_id, user_id, album_id, album_name, artist_id, artist_name, rank)
  values (snapshot_id, owner_id, current_setting('stats.test.item_id'), 'Privacy fixture', current_setting('stats.test.item_id'), 'Privacy fixture', 1);
end $$;

create function pg_temp.assert_history_access(case_name text, expected_rows integer)
returns void language plpgsql security invoker as $$
declare
  owner_id uuid := current_setting('stats.test.owner_id')::uuid;
  fixture_snapshot uuid := current_setting('stats.test.snapshot_id')::uuid;
  item_id text := current_setting('stats.test.item_id');
  item_type text;
  table_name text;
  actual bigint;
  checks integer := 0;
begin
  foreach item_type in array array['artist', 'track', 'album'] loop
    table_name := item_type || '_rankings';
    execute format('select count(*) from public.%I where snapshot_id=$1', table_name)
      into actual using fixture_snapshot;
    if actual <> expected_rows then raise exception '%: direct % expected %, got %', case_name, table_name, expected_rows, actual; end if;
    checks := checks + 1;

    select count(*) into actual from public.get_ranking_history(p_user_id=>owner_id, p_item_id=>item_id, p_item_type=>item_type, p_time_range=>'medium_term');
    if actual <> expected_rows then raise exception '%: history item overload/% expected %, got %', case_name, item_type, expected_rows, actual; end if;
    checks := checks + 1;

    select count(*) into actual from public.get_ranking_history(p_user_id=>owner_id, p_entity_id=>item_id, p_entity_type=>item_type, p_time_range=>'medium_term', p_limit=>1);
    if actual <> expected_rows then raise exception '%: history entity overload/% expected %, got %', case_name, item_type, expected_rows, actual; end if;
    checks := checks + 1;

    select count(*) into actual from public.get_sparkline_data(p_user_id=>owner_id, p_item_ids=>array[item_id], p_item_type=>item_type, p_days=>14);
    if actual <> expected_rows then raise exception '%: sparkline batch overload/% expected %, got %', case_name, item_type, expected_rows, actual; end if;
    checks := checks + 1;

    select count(*) into actual from public.get_sparkline_data(p_user_id=>owner_id, p_entity_id=>item_id, p_entity_type=>item_type, p_time_range=>'medium_term', p_limit=>1);
    if actual <> expected_rows then raise exception '%: sparkline entity overload/% expected %, got %', case_name, item_type, expected_rows, actual; end if;
    checks := checks + 1;
  end loop;

  select count(*) into actual from public.snapshots where id=fixture_snapshot;
  if actual <> expected_rows then raise exception '%: snapshots expected %, got %', case_name, expected_rows, actual; end if;
  checks := checks + 1;

  select count(*) into actual from public.get_latest_snapshot(owner_id, 'medium_term') where snapshot_id=fixture_snapshot;
  if actual <> expected_rows then raise exception '%: latest snapshot expected %, got %', case_name, expected_rows, actual; end if;
  checks := checks + 1;
  perform set_config('stats.test.checks', (current_setting('stats.test.checks')::integer + checks)::text, true);
end $$;

-- Owner reads remain available even when their profile is private.
update public.user_profiles set stats_visibility='private' where user_id=current_setting('stats.test.owner_id')::uuid;
do $$ begin perform set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('stats.test.owner_id'), 'role', 'authenticated')::text, true); end $$;
set local role authenticated;
select pg_temp.assert_history_access('owner_private', 1);
reset role;

-- Accepted friend: forward and reverse relationship directions.
update public.user_profiles set stats_visibility='followers' where user_id=current_setting('stats.test.owner_id')::uuid;
delete from public.friendships where
  (user_id=current_setting('stats.test.owner_id')::uuid and friend_id=current_setting('stats.test.viewer_id')::uuid) or
  (friend_id=current_setting('stats.test.owner_id')::uuid and user_id=current_setting('stats.test.viewer_id')::uuid);
insert into public.friendships (user_id, friend_id, status)
values (current_setting('stats.test.viewer_id')::uuid, current_setting('stats.test.owner_id')::uuid, 'accepted');
do $$ begin perform set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('stats.test.viewer_id'), 'role', 'authenticated')::text, true); end $$;
set local role authenticated;
select pg_temp.assert_history_access('accepted_forward_followers', 1);
reset role;
update public.friendships set user_id=current_setting('stats.test.owner_id')::uuid, friend_id=current_setting('stats.test.viewer_id')::uuid
where user_id=current_setting('stats.test.viewer_id')::uuid and friend_id=current_setting('stats.test.owner_id')::uuid;
set local role authenticated;
select pg_temp.assert_history_access('accepted_reverse_followers', 1);
reset role;

update public.user_profiles set stats_visibility='public' where user_id=current_setting('stats.test.owner_id')::uuid;
set local role authenticated;
select pg_temp.assert_history_access('accepted_public', 1);
reset role;
update public.user_profiles set stats_visibility='private' where user_id=current_setting('stats.test.owner_id')::uuid;
set local role authenticated;
select pg_temp.assert_history_access('accepted_private', 0);
reset role;

-- Removing acceptance immediately removes access to previously shared history.
update public.user_profiles set stats_visibility='followers' where user_id=current_setting('stats.test.owner_id')::uuid;
update public.friendships set status='pending' where user_id=current_setting('stats.test.owner_id')::uuid and friend_id=current_setting('stats.test.viewer_id')::uuid;
set local role authenticated;
select pg_temp.assert_history_access('pending', 0);
reset role;
update public.friendships set status='blocked' where user_id=current_setting('stats.test.owner_id')::uuid and friend_id=current_setting('stats.test.viewer_id')::uuid;
set local role authenticated;
select pg_temp.assert_history_access('blocked', 0);
reset role;
delete from public.friendships where user_id=current_setting('stats.test.owner_id')::uuid and friend_id=current_setting('stats.test.viewer_id')::uuid;
set local role authenticated;
select pg_temp.assert_history_access('removed', 0);
reset role;

-- Preserve the existing friend-only direct-read boundary even for public stats.
update public.user_profiles set stats_visibility='public' where user_id=current_setting('stats.test.owner_id')::uuid;
set local role authenticated;
select pg_temp.assert_history_access('unrelated_public', 0);
reset role;
do $$ begin perform set_config('request.jwt.claims', '{}', true); end $$;
set local role anon;
select pg_temp.assert_history_access('anonymous_public', 0);
reset role;
update public.user_profiles set stats_visibility='followers' where user_id=current_setting('stats.test.owner_id')::uuid;
set local role anon;
select pg_temp.assert_history_access('anonymous_followers', 0);
reset role;

-- Backend snapshot collection still uses the service role's existing privileges.
update public.user_profiles set stats_visibility='private' where user_id=current_setting('stats.test.owner_id')::uuid;
set local role service_role;
select pg_temp.assert_history_access('service_role_private', 1);
reset role;

select 'friend_history_privacy passed' as result, current_setting('stats.test.checks')::integer as assertions;
rollback;
