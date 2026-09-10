-- Run history reads with the caller's privileges so table RLS is authoritative.
alter function public.get_ranking_history(uuid, text, text, text) security invoker;
alter function public.get_ranking_history(uuid, text, text, text, integer) security invoker;
alter function public.get_sparkline_data(uuid, text[], text, integer) security invoker;
alter function public.get_sparkline_data(uuid, text, text, text, integer) security invoker;
alter function public.get_latest_snapshot(uuid, text) security invoker;

-- Restrictive policies intersect the existing own/accepted-friend policies.
-- Reusing the visibility helper alone as a permissive policy would also expose
-- public profiles' ranking rows to anonymous callers and unrelated users.
create policy "Respect stats visibility when reading snapshots"
  on public.snapshots as restrictive for select to public
  using (public.can_view_user_stats(user_id));

create policy "Respect stats visibility when reading artist rankings"
  on public.artist_rankings as restrictive for select to public
  using (public.can_view_user_stats(user_id));

create policy "Respect stats visibility when reading track rankings"
  on public.track_rankings as restrictive for select to public
  using (public.can_view_user_stats(user_id));

create policy "Respect stats visibility when reading album rankings"
  on public.album_rankings as restrictive for select to public
  using (public.can_view_user_stats(user_id));
