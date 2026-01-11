create or replace function public.get_plot_twists_recap(
  p_target_user_id uuid,
  p_days int default 30,
  p_limit int default 20
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  effective_days int := greatest(1, least(coalesce(p_days, 30), 3650));
  effective_limit int := greatest(1, least(coalesce(p_limit, 20), 100));
  result jsonb;
begin
  perform public.assert_can_view_user_stats(p_target_user_id);

  with ordered_snapshots as (
    select
      s.time_range,
      s.id as snapshot_id,
      date(s.created_at at time zone 'utc') as day,
      lead(s.id) over (partition by s.time_range order by s.created_at asc) as next_snapshot_id,
      lead(date(s.created_at at time zone 'utc')) over (partition by s.time_range order by s.created_at asc) as next_day
    from public.snapshots s
    where s.user_id = p_target_user_id
      and s.created_at >= now() - (effective_days || ' days')::interval
  ),
  artist_ranked as (
    select
      os.time_range,
      os.day,
      ar.artist_id as item_id,
      ar.artist_name as item_name,
      ar.artist_image_url as item_image_url,
      ar.rank,
      ar.previous_rank,
      (ar.previous_rank - ar.rank) as delta
    from ordered_snapshots os
    join public.artist_rankings ar on ar.snapshot_id = os.snapshot_id
    where ar.rank <= 20
      and ar.previous_rank is not null
  ),
  album_ranked as (
    select
      os.time_range,
      os.day,
      abr.album_id as item_id,
      abr.album_name as item_name,
      abr.album_image_url as item_image_url,
      abr.rank,
      abr.previous_rank,
      (abr.previous_rank - abr.rank) as delta
    from ordered_snapshots os
    join public.album_rankings abr on abr.snapshot_id = os.snapshot_id
    where abr.rank <= 20
      and abr.previous_rank is not null
  ),
  artist_best_climb_per_day as (
    select
      *,
      row_number() over (partition by time_range, day order by delta desc, rank asc, item_id asc) as rn
    from artist_ranked
    where delta > 0
  ),
  artist_best_drop_per_day as (
    select
      *,
      row_number() over (partition by time_range, day order by delta asc, rank asc, item_id asc) as rn
    from artist_ranked
    where delta < 0
  ),
  album_best_climb_per_day as (
    select
      *,
      row_number() over (partition by time_range, day order by delta desc, rank asc, item_id asc) as rn
    from album_ranked
    where delta > 0
  ),
  album_best_drop_per_day as (
    select
      *,
      row_number() over (partition by time_range, day order by delta asc, rank asc, item_id asc) as rn
    from album_ranked
    where delta < 0
  ),
  artist_new_entry_top10_ranked as (
    select
      os.time_range,
      os.day,
      ar.artist_id as item_id,
      ar.artist_name as item_name,
      ar.artist_image_url as item_image_url,
      ar.rank,
      ar.previous_rank,
      null::int as delta,
      row_number() over (partition by os.time_range, os.day order by ar.rank asc, ar.artist_id asc) as rn
    from ordered_snapshots os
    join public.artist_rankings ar on ar.snapshot_id = os.snapshot_id
    where ar.rank <= 10
      and ar.previous_rank is null
  ),
  album_new_entry_top10_ranked as (
    select
      os.time_range,
      os.day,
      abr.album_id as item_id,
      abr.album_name as item_name,
      abr.album_image_url as item_image_url,
      abr.rank,
      abr.previous_rank,
      null::int as delta,
      row_number() over (partition by os.time_range, os.day order by abr.rank asc, abr.album_id asc) as rn
    from ordered_snapshots os
    join public.album_rankings abr on abr.snapshot_id = os.snapshot_id
    where abr.rank <= 10
      and abr.previous_rank is null
  ),
  artist_top10_with_next as (
    select
      os.time_range,
      os.day,
      os.next_snapshot_id,
      os.next_day,
      ar.artist_id as item_id,
      ar.artist_name as item_name,
      ar.artist_image_url as item_image_url,
      ar.rank,
      ar.previous_rank
    from ordered_snapshots os
    join public.artist_rankings ar on ar.snapshot_id = os.snapshot_id
    where ar.rank <= 10
  ),
  album_top10_with_next as (
    select
      os.time_range,
      os.day,
      os.next_snapshot_id,
      os.next_day,
      abr.album_id as item_id,
      abr.album_name as item_name,
      abr.album_image_url as item_image_url,
      abr.rank,
      abr.previous_rank
    from ordered_snapshots os
    join public.album_rankings abr on abr.snapshot_id = os.snapshot_id
    where abr.rank <= 10
  ),
  artist_dropouts as (
    select
      ct.time_range,
      ct.day,
      ct.item_id,
      ct.item_name,
      ct.item_image_url,
      ct.rank,
      ct.previous_rank,
      null::int as delta,
      jsonb_build_object('next_date', ct.next_day::text, 'was_rank', ct.rank) as context
    from artist_top10_with_next ct
    left join public.artist_rankings next_ar
      on next_ar.snapshot_id = ct.next_snapshot_id
     and next_ar.artist_id = ct.item_id
    where ct.next_snapshot_id is not null
      and next_ar.artist_id is null
  ),
  album_dropouts as (
    select
      ct.time_range,
      ct.day,
      ct.item_id,
      ct.item_name,
      ct.item_image_url,
      ct.rank,
      ct.previous_rank,
      null::int as delta,
      jsonb_build_object('next_date', ct.next_day::text, 'was_rank', ct.rank) as context
    from album_top10_with_next ct
    left join public.album_rankings next_abr
      on next_abr.snapshot_id = ct.next_snapshot_id
     and next_abr.album_id = ct.item_id
    where ct.next_snapshot_id is not null
      and next_abr.album_id is null
  ),
  artist_events as (
    select
      time_range,
      'biggest_climb'::text as event_type,
      day,
      item_id,
      item_name,
      item_image_url,
      rank,
      previous_rank,
      delta::int as delta,
      null::jsonb as context
    from artist_best_climb_per_day
    where rn = 1

    union all

    select
      time_range,
      'biggest_drop'::text as event_type,
      day,
      item_id,
      item_name,
      item_image_url,
      rank,
      previous_rank,
      delta::int as delta,
      null::jsonb as context
    from artist_best_drop_per_day
    where rn = 1

    union all

    select
      time_range,
      'new_entry_top10'::text as event_type,
      day,
      item_id,
      item_name,
      item_image_url,
      rank,
      previous_rank,
      null::int as delta,
      null::jsonb as context
    from artist_new_entry_top10_ranked
    where rn <= 2

    union all

    select
      time_range,
      'dropped_out_after_top10'::text as event_type,
      day,
      item_id,
      item_name,
      item_image_url,
      rank,
      previous_rank,
      null::int as delta,
      context
    from artist_dropouts
  ),
  album_events as (
    select
      time_range,
      'biggest_climb'::text as event_type,
      day,
      item_id,
      item_name,
      item_image_url,
      rank,
      previous_rank,
      delta::int as delta,
      null::jsonb as context
    from album_best_climb_per_day
    where rn = 1

    union all

    select
      time_range,
      'biggest_drop'::text as event_type,
      day,
      item_id,
      item_name,
      item_image_url,
      rank,
      previous_rank,
      delta::int as delta,
      null::jsonb as context
    from album_best_drop_per_day
    where rn = 1

    union all

    select
      time_range,
      'new_entry_top10'::text as event_type,
      day,
      item_id,
      item_name,
      item_image_url,
      rank,
      previous_rank,
      null::int as delta,
      null::jsonb as context
    from album_new_entry_top10_ranked
    where rn <= 2

    union all

    select
      time_range,
      'dropped_out_after_top10'::text as event_type,
      day,
      item_id,
      item_name,
      item_image_url,
      rank,
      previous_rank,
      null::int as delta,
      context
    from album_dropouts
  ),
  artist_events_ranked as (
    select
      *,
      row_number() over (
        partition by time_range
        order by coalesce(abs(delta), 0) desc, day desc, rank asc, item_id asc
      ) as rn
    from artist_events
  ),
  album_events_ranked as (
    select
      *,
      row_number() over (
        partition by time_range
        order by coalesce(abs(delta), 0) desc, day desc, rank asc, item_id asc
      ) as rn
    from album_events
  ),
  time_ranges as (
    select unnest(array['short_term'::text, 'medium_term'::text, 'long_term'::text]) as time_range
  ),
  per_range as (
    select
      tr.time_range,
      jsonb_build_object(
        'artists',
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'event_type', aer.event_type,
                'date', aer.day::text,
                'item_id', aer.item_id,
                'item_name', aer.item_name,
                'item_image_url', aer.item_image_url,
                'rank', aer.rank,
                'previous_rank', aer.previous_rank,
                'delta', aer.delta,
                'context', aer.context
              )
              order by coalesce(abs(aer.delta), 0) desc, aer.day desc, aer.rank asc, aer.item_id asc
            )
            from artist_events_ranked aer
            where aer.time_range = tr.time_range
              and aer.rn <= effective_limit
          ),
          '[]'::jsonb
        ),
        'albums',
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'event_type', ber.event_type,
                'date', ber.day::text,
                'item_id', ber.item_id,
                'item_name', ber.item_name,
                'item_image_url', ber.item_image_url,
                'rank', ber.rank,
                'previous_rank', ber.previous_rank,
                'delta', ber.delta,
                'context', ber.context
              )
              order by coalesce(abs(ber.delta), 0) desc, ber.day desc, ber.rank asc, ber.item_id asc
            )
            from album_events_ranked ber
            where ber.time_range = tr.time_range
              and ber.rn <= effective_limit
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

grant execute on function public.get_plot_twists_recap(uuid, int, int) to anon, authenticated, service_role;

