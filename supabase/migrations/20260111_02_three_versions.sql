create or replace function public.get_three_versions_of_you(
  p_target_user_id uuid,
  p_limit int default 10
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  effective_limit int := greatest(1, least(coalesce(p_limit, 10), 50));
  result jsonb;
begin
  perform public.assert_can_view_user_stats(p_target_user_id);

  with latest_snapshots as (
    select
      'short_term'::text as time_range,
      (select ls.snapshot_id from public.get_latest_snapshot(p_target_user_id, 'short_term') ls limit 1) as snapshot_id
    union all
    select
      'medium_term'::text as time_range,
      (select ls.snapshot_id from public.get_latest_snapshot(p_target_user_id, 'medium_term') ls limit 1) as snapshot_id
    union all
    select
      'long_term'::text as time_range,
      (select ls.snapshot_id from public.get_latest_snapshot(p_target_user_id, 'long_term') ls limit 1) as snapshot_id
  ),
  artist_short as (
    select
      ar.artist_id as id,
      ar.artist_name as name,
      ar.artist_image_url as image_url,
      ar.rank
    from public.artist_rankings ar
    join latest_snapshots ls on ls.snapshot_id = ar.snapshot_id and ls.time_range = 'short_term'
    order by ar.rank asc
    limit effective_limit
  ),
  artist_medium as (
    select
      ar.artist_id as id,
      ar.artist_name as name,
      ar.artist_image_url as image_url,
      ar.rank
    from public.artist_rankings ar
    join latest_snapshots ls on ls.snapshot_id = ar.snapshot_id and ls.time_range = 'medium_term'
    order by ar.rank asc
    limit effective_limit
  ),
  artist_long as (
    select
      ar.artist_id as id,
      ar.artist_name as name,
      ar.artist_image_url as image_url,
      ar.rank
    from public.artist_rankings ar
    join latest_snapshots ls on ls.snapshot_id = ar.snapshot_id and ls.time_range = 'long_term'
    order by ar.rank asc
    limit effective_limit
  ),
  artist_constants as (
    select id from artist_short
    intersect
    select id from artist_medium
    intersect
    select id from artist_long
  ),
  artist_unique_short as (
    select id from artist_short
    except
    (select id from artist_medium union select id from artist_long)
  ),
  artist_unique_medium as (
    select id from artist_medium
    except
    (select id from artist_short union select id from artist_long)
  ),
  artist_unique_long as (
    select id from artist_long
    except
    (select id from artist_short union select id from artist_medium)
  ),
  artist_shift_long_vs_short as (
    select
      s.id,
      s.name,
      s.image_url,
      s.rank as short_rank,
      l.rank as long_rank,
      (l.rank - s.rank) as delta
    from artist_short s
    join artist_long l on l.id = s.id
    order by abs(l.rank - s.rank) desc, l.rank asc
    limit least(effective_limit, 10)
  ),
  album_short as (
    select
      ar.album_id as id,
      ar.album_name as name,
      ar.album_image_url as image_url,
      ar.rank
    from public.album_rankings ar
    join latest_snapshots ls on ls.snapshot_id = ar.snapshot_id and ls.time_range = 'short_term'
    order by ar.rank asc
    limit effective_limit
  ),
  album_medium as (
    select
      ar.album_id as id,
      ar.album_name as name,
      ar.album_image_url as image_url,
      ar.rank
    from public.album_rankings ar
    join latest_snapshots ls on ls.snapshot_id = ar.snapshot_id and ls.time_range = 'medium_term'
    order by ar.rank asc
    limit effective_limit
  ),
  album_long as (
    select
      ar.album_id as id,
      ar.album_name as name,
      ar.album_image_url as image_url,
      ar.rank
    from public.album_rankings ar
    join latest_snapshots ls on ls.snapshot_id = ar.snapshot_id and ls.time_range = 'long_term'
    order by ar.rank asc
    limit effective_limit
  ),
  album_constants as (
    select id from album_short
    intersect
    select id from album_medium
    intersect
    select id from album_long
  ),
  album_unique_short as (
    select id from album_short
    except
    (select id from album_medium union select id from album_long)
  ),
  album_unique_medium as (
    select id from album_medium
    except
    (select id from album_short union select id from album_long)
  ),
  album_unique_long as (
    select id from album_long
    except
    (select id from album_short union select id from album_medium)
  ),
  album_shift_long_vs_short as (
    select
      s.id,
      s.name,
      s.image_url,
      s.rank as short_rank,
      l.rank as long_rank,
      (l.rank - s.rank) as delta
    from album_short s
    join album_long l on l.id = s.id
    order by abs(l.rank - s.rank) desc, l.rank asc
    limit least(effective_limit, 10)
  )
  select jsonb_build_object(
    'artists', jsonb_build_object(
      'short_term', coalesce(
        (select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'image_url', image_url, 'rank', rank) order by rank) from artist_short),
        '[]'::jsonb
      ),
      'medium_term', coalesce(
        (select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'image_url', image_url, 'rank', rank) order by rank) from artist_medium),
        '[]'::jsonb
      ),
      'long_term', coalesce(
        (select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'image_url', image_url, 'rank', rank) order by rank) from artist_long),
        '[]'::jsonb
      ),
      'constants', coalesce((select jsonb_agg(id order by id) from artist_constants), '[]'::jsonb),
      'unique_short', coalesce((select jsonb_agg(id order by id) from artist_unique_short), '[]'::jsonb),
      'unique_medium', coalesce((select jsonb_agg(id order by id) from artist_unique_medium), '[]'::jsonb),
      'unique_long', coalesce((select jsonb_agg(id order by id) from artist_unique_long), '[]'::jsonb),
      'biggest_shift_long_vs_short', coalesce(
        (select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'image_url', image_url,
            'short_rank', short_rank,
            'long_rank', long_rank,
            'delta', delta
          )
          order by abs(delta) desc, long_rank asc
        ) from artist_shift_long_vs_short),
        '[]'::jsonb
      )
    ),
    'albums', jsonb_build_object(
      'short_term', coalesce(
        (select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'image_url', image_url, 'rank', rank) order by rank) from album_short),
        '[]'::jsonb
      ),
      'medium_term', coalesce(
        (select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'image_url', image_url, 'rank', rank) order by rank) from album_medium),
        '[]'::jsonb
      ),
      'long_term', coalesce(
        (select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'image_url', image_url, 'rank', rank) order by rank) from album_long),
        '[]'::jsonb
      ),
      'constants', coalesce((select jsonb_agg(id order by id) from album_constants), '[]'::jsonb),
      'unique_short', coalesce((select jsonb_agg(id order by id) from album_unique_short), '[]'::jsonb),
      'unique_medium', coalesce((select jsonb_agg(id order by id) from album_unique_medium), '[]'::jsonb),
      'unique_long', coalesce((select jsonb_agg(id order by id) from album_unique_long), '[]'::jsonb),
      'biggest_shift_long_vs_short', coalesce(
        (select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'image_url', image_url,
            'short_rank', short_rank,
            'long_rank', long_rank,
            'delta', delta
          )
          order by abs(delta) desc, long_rank asc
        ) from album_shift_long_vs_short),
        '[]'::jsonb
      )
    )
  )
  into result;

  return coalesce(result, '{}'::jsonb);
end;
$$;

grant execute on function public.get_three_versions_of_you(uuid, int) to anon, authenticated, service_role;

