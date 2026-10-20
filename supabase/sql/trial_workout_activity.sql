-- Trial nurture — per-trialist logged-workout activity (staff read).
-- workout_history is RLS-locked to each member (own rows only), so staff can't
-- read trialists' workouts directly. This SECURITY DEFINER RPC returns the
-- workout dates for a set of trialist emails so the nurture board can show
-- "logged N workouts, last <date>" as a secondary activity signal.
-- Maps email → members.id (auth uid) → workout_history.user_id. Staff only.
-- Run in Supabase. Safe to re-run.

create or replace function public.trial_workout_activity(p_emails text[])
returns table (email text, at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'staff only';
  end if;
  return query
    select lower(m.email) as email, w.date as at
    from public.members m
    join public.workout_history w on w.user_id = m.id
    where lower(m.email) = any (select lower(e) from unnest(p_emails) e);
end;
$$;

grant execute on function public.trial_workout_activity(text[]) to authenticated;

notify pgrst, 'reload schema';
