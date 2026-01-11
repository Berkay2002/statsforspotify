create or replace function public.get_album_takeover_recap(
  p_target_user_id uuid,
  p_days int default 90
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  effective_days int := greatest(1, least(coalesce(p_days, 90), 3650));
  timeline_limit int := least(effective_days, 90);
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
  top_album_per_snapshot as (
    select
      ws.time_range,
      ws.day,
      ar.album_id,
      ar.album_name,
      ar.album_image_url,
      ar.track_count,
      (ar.track_count / 50.0) as takeover_percent
    from window_snapshots ws
    join public.album_rankings ar on ar.snapshot_id = ws.id
    where ar.rank = 1
  ),
  latest_per_range as (
    select distinct on (time_range) *
    from top_album_per_snapshot
    order by time_range, day desc
  ),
  record_per_range as (
    select distinct on (time_range) *
    from top_album_per_snapshot
    order by time_range, track_count desc, day desc
  ),
  most_frequent_counts as (
    select
      time_range,
      album_id,
      max(album_name) as album_name,
      max(album_image_url) as album_image_url,
      count(*)::int as days_at_1,
      max(day) as latest_day
    from top_album_per_snapshot
    group by time_range, album_id
  ),
  most_frequent_per_range as (
    select distinct on (time_range)
      time_range,
      album_id,
      album_name,
      album_image_url,
      days_at_1
    from most_frequent_counts
    order by time_range, days_at_1 desc, latest_day desc, album_id asc
  ),
  timeline_ranked as (
    select
      t.*,
      row_number() over (partition by t.time_range order by t.day desc) as rn
    from top_album_per_snapshot t
  ),
  timeline_limited as (
    select
      time_range,
      day,
      album_id,
      album_name,
      album_image_url,
      track_count,
      takeover_percent
    from timeline_ranked
    where rn <= timeline_limit
  ),
  time_ranges as (
    select unnest(array['short_term'::text, 'medium_term'::text, 'long_term'::text]) as time_range
  ),
  per_range as (
    select
      tr.time_range,
      jsonb_build_object(
        'latest',
        (
          select case when l.time_range is null then null else jsonb_build_object(
            'date', l.day::text,
            'album_id', l.album_id,
            'album_name', l.album_name,
            'album_image_url', l.album_image_url,
            'track_count', l.track_count,
            'takeover_percent', l.takeover_percent
          ) end
          from latest_per_range l
          where l.time_range = tr.time_range
        ),
        'record',
        (
          select case when r.time_range is null then null else jsonb_build_object(
            'date', r.day::text,
            'album_id', r.album_id,
            'album_name', r.album_name,
            'album_image_url', r.album_image_url,
            'track_count', r.track_count,
            'takeover_percent', r.takeover_percent
          ) end
          from record_per_range r
          where r.time_range = tr.time_range
        ),
        'most_frequent',
        (
          select case when mf.time_range is null then null else jsonb_build_object(
            'album_id', mf.album_id,
            'album_name', mf.album_name,
            'album_image_url', mf.album_image_url,
            'days_at_1', mf.days_at_1
          ) end
          from most_frequent_per_range mf
          where mf.time_range = tr.time_range
        ),
        'timeline',
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'date', tl.day::text,
                'album_id', tl.album_id,
                'album_name', tl.album_name,
                'album_image_url', tl.album_image_url,
                'track_count', tl.track_count,
                'takeover_percent', tl.takeover_percent
              )
              order by tl.day asc
            )
            from timeline_limited tl
            where tl.time_range = tr.time_range
          ),
          '[]'::jsonb
        )
      ) as value
    from time_ranges tr
  )
  select jsonb_object_agg(time_range, value)
  into result
  from per_range;

  return coalesce(result, '{}'::jsonb);
end;
$$;

grant execute on function public.get_album_takeover_recap(uuid, int) to anon, authenticated, service_role;

