-- Communal (class) metres for the Million Metre challenge.
-- Staff can add metres that count toward the GYM TOTAL but aren't attributed to
-- anyone — for classes where people don't log individually. These rows have
-- member_id = NULL and source = 'class'; the summary (total) includes them, both
-- leaderboards exclude them. Run in Supabase. Safe to re-run.

-- Allow unattributed rows.
alter table public.erg_challenge_logs alter column member_id drop not null;

-- Widen the source check to include 'class'.
alter table public.erg_challenge_logs
  drop constraint if exists erg_challenge_logs_source_chk;
alter table public.erg_challenge_logs
  add constraint erg_challenge_logs_source_chk
  check (source in ('manual','workout','staff','class'));

-- Leaderboards: exclude communal (null-member) rows so they never show a name.
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
  where l.member_id is not null
  group by l.member_id, m.full_name, l.machine;
$$;
grant execute on function public.erg_challenge_leaderboard_public() to authenticated;

create or replace function public.erg_challenge_leaderboard()
returns table (member_id uuid, name text, total_metres bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'staff only';
  end if;
  return query
    select l.member_id,
           coalesce(m.full_name, m.email, left(l.member_id::text, 8)) as name,
           sum(l.metres)::bigint as total_metres
    from public.erg_challenge_logs l
    left join public.members m on m.id = l.member_id
    where l.member_id is not null
    group by l.member_id, m.full_name, m.email
    order by sum(l.metres) desc;
end;
$$;
grant execute on function public.erg_challenge_leaderboard() to authenticated;

-- (erg_challenge_summary is unchanged — it already sums ALL rows, so communal
--  metres count toward the collective total but not anyone's "my" total.)

notify pgrst, 'reload schema';
