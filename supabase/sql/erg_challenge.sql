-- Gym-wide "Million Metre" erg challenge.
-- Members log metres on the bike erg / rower / ski-erg; the app shows a live
-- collective total per machine against a target, plus the member's own total.
-- Targets + deadline live in the app (bike 2,000,000 m; rower 1,000,000 m;
-- ski 1,000,000 m; by Christmas) so they can be tweaked without a migration.
-- Run in Supabase. Safe to re-run.

create table if not exists public.erg_challenge_logs (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null default auth.uid(),
  machine    text not null check (machine in ('bike','rower','ski')),
  metres     int  not null check (metres > 0 and metres <= 100000),
  -- 'manual' = the member logged it; 'workout' = auto-counted from a saved
  -- workout. source_ref dedupes auto entries so re-saving a workout replaces
  -- its contribution instead of adding again (e.g. '<workout_id>:bike').
  source     text not null default 'manual' check (source in ('manual','workout')),
  source_ref text,
  created_at timestamptz not null default now()
);

-- Ensure the source columns exist even if the table was created by an earlier
-- run (create table if not exists won't add new columns to an existing table).
alter table public.erg_challenge_logs
  add column if not exists source text not null default 'manual';
alter table public.erg_challenge_logs
  add column if not exists source_ref text;
do $$ begin
  alter table public.erg_challenge_logs
    add constraint erg_challenge_logs_source_chk check (source in ('manual','workout'));
exception when duplicate_object then null; end $$;

create index if not exists erg_challenge_logs_machine_idx
  on public.erg_challenge_logs (machine);
create index if not exists erg_challenge_logs_member_idx
  on public.erg_challenge_logs (member_id);
-- One auto row per (workout, machine): upsert target for workout contributions.
create unique index if not exists erg_challenge_logs_source_ref_idx
  on public.erg_challenge_logs (source_ref) where source_ref is not null;

alter table public.erg_challenge_logs enable row level security;

-- INSERT: a member logs only their own metres.
drop policy if exists erg_logs_insert_own on public.erg_challenge_logs;
create policy erg_logs_insert_own on public.erg_challenge_logs
  for insert to authenticated
  with check (member_id = auth.uid());

-- SELECT: a member sees their own rows (for "your contribution" / recent logs);
-- staff can see all for oversight. The collective total is exposed via the RPC
-- below, so individual rows stay private between members.
drop policy if exists erg_logs_select_own on public.erg_challenge_logs;
create policy erg_logs_select_own on public.erg_challenge_logs
  for select to authenticated
  using (member_id = auth.uid() or public.is_staff());

-- DELETE: a member can remove their own mis-entry (staff too).
drop policy if exists erg_logs_delete_own on public.erg_challenge_logs;
create policy erg_logs_delete_own on public.erg_challenge_logs
  for delete to authenticated
  using (member_id = auth.uid() or public.is_staff());

-- One call returns everything the UI needs: per machine, the collective total
-- (across everyone) and the caller's own total. SECURITY DEFINER so it can sum
-- all rows while individual rows remain unreadable via the table policy.
create or replace function public.erg_challenge_summary()
returns table (machine text, total_metres bigint, my_metres bigint)
language sql
security definer
set search_path = public
as $$
  select
    m.machine,
    coalesce(sum(l.metres), 0)::bigint as total_metres,
    coalesce(sum(l.metres) filter (where l.member_id = auth.uid()), 0)::bigint as my_metres
  from (values ('bike'), ('rower'), ('ski')) as m(machine)
  left join public.erg_challenge_logs l on l.machine = m.machine
  group by m.machine;
$$;

grant execute on function public.erg_challenge_summary() to authenticated;

-- notify PostgREST to reload the schema cache so the RPC is callable immediately.
notify pgrst, 'reload schema';
