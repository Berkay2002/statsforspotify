create or replace function public.get_hall_of_fame_recap(
  p_target_user_id uuid,
  p_days int default 365,
  p_limit int default 10
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  effective_days int := greatest(1, least(coalesce(p_days, 365), 3650));
  effective_limit int := greatest(1, least(coalesce(p_limit, 10), 50));
  result jsonb;
begin
  perform public.assert_can_view_user_stats(p_target_user_id);

  with window_snapshots as (
    select
      s.id,
      s.time_range,
      date(s.created_at at time zone 'utc') as day,
      s.created_at
    from public.snapshots s
    where s.user_id = p_target_user_id
      and s.created_at >= now() - (effective_days || ' days')::interval
  ),
  artist_days as (
    select
      ws.time_range,
      ar.artist_id as id,
      ar.artist_name as name,
      ar.artist_image_url as image_url,
      ws.day,
      ar.rank
    from window_snapshots ws
    join public.artist_rankings ar on ar.snapshot_id = ws.id
  ),
  album_days as (
    select
      ws.time_range,
      abr.album_id as id,
      abr.album_name as name,
      abr.album_image_url as image_url,
      ws.day,
      abr.rank
    from window_snapshots ws
    join public.album_rankings abr on abr.snapshot_id = ws.id
  ),
  artist_days_charted as (
    select
      time_range,
      id,
      max(name) as name,
      max(image_url) as image_url,
      count(distinct day)::int as days_charted
    from artist_days
    group by time_range, id
  ),
  album_days_charted as (
    select
      time_range,
      id,
      max(name) as name,
      max(image_url) as image_url,
      count(distinct day)::int as days_charted
    from album_days
    group by time_range, id
  ),
  artist_days_charted_ranked as (
    select
      *,
      row_number() over (partition by time_range order by days_charted desc, name asc, id asc) as rn
    from artist_days_charted
  ),
  album_days_charted_ranked as (
    select
      *,
      row_number() over (partition by time_range order by days_charted desc, name asc, id asc) as rn
    from album_days_charted
  ),
  artist_most_days_charted as (
    select
      time_range,
      coalesce(
        jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'image_url', image_url, 'days_charted', days_charted)
          order by days_charted desc, name asc, id asc
        ),
        '[]'::jsonb
      ) as value
    from artist_days_charted_ranked
    where rn <= effective_limit
    group by time_range
  ),
  album_most_days_charted as (
    select
      time_range,
      coalesce(
        jsonb_agg(
          jsonb_build_object('id', id, 'name', name, 'image_url', image_url, 'days_charted', days_charted)
          order by days_charted desc, name asc, id asc
        ),
        '[]'::jsonb
      ) as value
    from album_days_charted_ranked
    where rn <= effective_limit
    group by time_range
  ),
  artist_number_one_days as (
    select
      time_range,
      id,
      max(name) as name,
      max(image_url) as image_url,
      count(*)::int as number_one_days
    from artist_days
    where rank = 1
    group by time_range, id
  ),
  album_number_one_days as (
    select
      time_range,
      id,
      max(name) as name,
      max(image_url) as image_url,
      count(*)::int as number_one_days
    from album_days
    where rank = 1
    group by time_range, id
  ),
  artist_most_number_one_ranked as (
    select
      *,
      row_number() over (partition by time_range order by number_one_days desc, id asc) as rn
    from artist_number_one_days
  ),
  album_most_number_one_ranked as (
    select
      *,
      row_number() over (partition by time_range order by number_one_days desc, id asc) as rn
    from album_number_one_days
  ),
  artist_best_peak as (
    select
      time_range,
      id,
      max(name) as name,
      max(image_url) as image_url,
      min(rank)::int as peak_rank
    from artist_days
    group by time_range, id
  ),
  album_best_peak as (
    select
      time_range,
      id,
      max(name) as name,
      max(image_url) as image_url,
      min(rank)::int as peak_rank
    from album_days
    group by time_range, id
  ),
  artist_best_peak_ranked as (
    select
      *,
      row_number() over (partition by time_range order by peak_rank asc, id asc) as rn
    from artist_best_peak
  ),
  album_best_peak_ranked as (
    select
      *,
      row_number() over (partition by time_range order by peak_rank asc, id asc) as rn
    from album_best_peak
  ),
  artist_distinct_days as (
    select distinct time_range, id, name, image_url, day
    from artist_days
  ),
  album_distinct_days as (
    select distinct time_range, id, name, image_url, day
    from album_days
  ),
  artist_streak_groups as (
    select
      time_range,
      id,
      day,
      (day::timestamp - (row_number() over (partition by time_range, id order by day) * interval '1 day')) as grp
    from artist_distinct_days
  ),
  album_streak_groups as (
    select
      time_range,
      id,
      day,
      (day::timestamp - (row_number() over (partition by time_range, id order by day) * interval '1 day')) as grp
    from album_distinct_days
  ),
  artist_streak_lengths as (
    select
      time_range,
      id,
      grp,
      count(*)::int as streak_len
    from artist_streak_groups
    group by time_range, id, grp
  ),
  album_streak_lengths as (
    select
      time_range,
      id,
      grp,
      count(*)::int as streak_len
    from album_streak_groups
    group by time_range, id, grp
  ),
  artist_max_streak as (
    select
      asl.time_range,
      asl.id,
      max(ad.name) as name,
      max(ad.image_url) as image_url,
      max(asl.streak_len)::int as longest_streak_days
    from artist_streak_lengths asl
    join artist_distinct_days ad on ad.time_range = asl.time_range and ad.id = asl.id
    group by asl.time_range, asl.id
  ),
  album_max_streak as (
    select
      asl.time_range,
      asl.id,
      max(ad.name) as name,
      max(ad.image_url) as image_url,
      max(asl.streak_len)::int as longest_streak_days
    from album_streak_lengths asl
    join album_distinct_days ad on ad.time_range = asl.time_range and ad.id = asl.id
    group by asl.time_range, asl.id
  ),
  artist_max_streak_ranked as (
    select
      *,
      row_number() over (partition by time_range order by longest_streak_days desc, id asc) as rn
    from artist_max_streak
  ),
  album_max_streak_ranked as (
    select
      *,
      row_number() over (partition by time_range order by longest_streak_days desc, id asc) as rn
    from album_max_streak
  ),
  time_ranges as (
    select unnest(array['short_term'::text, 'medium_term'::text, 'long_term'::text]) as time_range
  ),
  per_range as (
    select
      tr.time_range,
      jsonb_build_object(
        'artists', jsonb_build_object(
          'most_days_charted', coalesce(amdc.value, '[]'::jsonb),
          'most_number_one_days', (
            select case when an1.time_range is null then null else jsonb_build_object(
              'id', an1.id,
              'name', an1.name,
              'image_url', an1.image_url,
              'number_one_days', an1.number_one_days
            ) end
            from artist_most_number_one_ranked an1
            where an1.time_range = tr.time_range and an1.rn = 1
          ),
          'best_peak_rank', (
            select case when ap.time_range is null then null else jsonb_build_object(
              'id', ap.id,
              'name', ap.name,
              'image_url', ap.image_url,
              'peak_rank', ap.peak_rank
            ) end
            from artist_best_peak_ranked ap
            where ap.time_range = tr.time_range and ap.rn = 1
          ),
          'longest_streak', (
            select case when ast.time_range is null then null else jsonb_build_object(
              'id', ast.id,
              'name', ast.name,
              'image_url', ast.image_url,
              'longest_streak_days', ast.longest_streak_days
            ) end
            from artist_max_streak_ranked ast
            where ast.time_range = tr.time_range and ast.rn = 1
          )
        ),
        'albums', jsonb_build_object(
          'most_days_charted', coalesce(bmdc.value, '[]'::jsonb),
          'most_number_one_days', (
            select case when bn1.time_range is null then null else jsonb_build_object(
              'id', bn1.id,
              'name', bn1.name,
              'image_url', bn1.image_url,
              'number_one_days', bn1.number_one_days
            ) end
            from album_most_number_one_ranked bn1
            where bn1.time_range = tr.time_range and bn1.rn = 1
          ),
          'best_peak_rank', (
            select case when bp.time_range is null then null else jsonb_build_object(
              'id', bp.id,
              'name', bp.name,
              'image_url', bp.image_url,
              'peak_rank', bp.peak_rank
            ) end
            from album_best_peak_ranked bp
            where bp.time_range = tr.time_range and bp.rn = 1
          ),
          'longest_streak', (
            select case when bst.time_range is null then null else jsonb_build_object(
              'id', bst.id,
              'name', bst.name,
              'image_url', bst.image_url,
              'longest_streak_days', bst.longest_streak_days
            ) end
            from album_max_streak_ranked bst
            where bst.time_range = tr.time_range and bst.rn = 1
          )
        )
      ) as value
    from time_ranges tr
    left join artist_most_days_charted amdc on amdc.time_range = tr.time_range
    left join album_most_days_charted bmdc on bmdc.time_range = tr.time_range
  )
  select jsonb_object_agg(time_range, value)
  into result
  from per_range;

  return coalesce(result, '{}'::jsonb);
end;
$$;

grant execute on function public.get_hall_of_fame_recap(uuid, int, int) to anon, authenticated, service_role;

create index if not exists idx_album_rankings_user_album
on public.album_rankings using btree (user_id, album_id);

create index if not exists idx_album_rankings_history
on public.album_rankings using btree (user_id, album_id, created_at desc);

create index if not exists idx_snapshots_user_time_range_created
on public.snapshots using btree (user_id, time_range, created_at desc);

