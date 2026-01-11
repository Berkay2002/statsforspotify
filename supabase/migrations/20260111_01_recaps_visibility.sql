create or replace function public.can_view_user_stats(p_target_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  viewer_id uuid := auth.uid();
  visibility text;
begin
  if p_target_user_id is null then
    return false;
  end if;

  if viewer_id = p_target_user_id then
    return true;
  end if;

  select up.stats_visibility
  into visibility
  from public.user_profiles up
  where up.user_id = p_target_user_id;

  if visibility is null then
    return false;
  end if;

  if visibility = 'public' then
    return true;
  end if;

  if visibility = 'followers' then
    if viewer_id is null then
      return false;
    end if;
    return public.check_friendship_status(viewer_id, p_target_user_id);
  end if;

  return false;
end;
$$;

create or replace function public.assert_can_view_user_stats(p_target_user_id uuid)
returns void
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.can_view_user_stats(p_target_user_id) then
    raise exception 'stats_visibility_denied' using errcode = '42501';
  end if;
end;
$$;

grant execute on function public.can_view_user_stats(uuid) to anon, authenticated, service_role;
grant execute on function public.assert_can_view_user_stats(uuid) to anon, authenticated, service_role;

