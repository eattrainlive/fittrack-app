-- Member-facing Million Metre leaderboard.
-- The original erg_challenge_leaderboard() is staff-only (raises for members).
-- This adds a PUBLIC board that every signed-in member can read, so we can show
-- top 10 per machine + overall and tell people where they rank. It returns only
-- a display name + summed metres (never email or individual log rows), matching
-- what the Workout-of-the-Week and block leaderboards already expose gym-wide.
-- SECURITY DEFINER so it can aggregate across everyone while the underlying
-- erg_challenge_logs table stays private per member.
-- Run in Supabase. Safe to re-run.

create or replace function public.erg_challenge_leaderboard_public()
returns table (member_id uuid, name text, machine text, metres bigint)
language sql
security definer
set search_path = public
as $$
  select
    l.member_id,
    coalesce(nullif(trim(m.full_name), ''), 'Member') as name,
    l.machine,
    sum(l.metres)::bigint as metres
  from public.erg_challenge_logs l
  left join public.members m on m.id = l.member_id
  group by l.member_id, m.full_name, l.machine;
$$;

grant execute on function public.erg_challenge_leaderboard_public() to authenticated;

-- notify PostgREST to reload the schema cache so the RPC is callable immediately.
notify pgrst, 'reload schema';
