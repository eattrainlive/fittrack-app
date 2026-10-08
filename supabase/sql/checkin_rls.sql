-- Check-in support: ensure the scan_events table exists, staff can write it, and add a `method` column.
-- The check-in edge function inserts with the service role (bypasses RLS), but these policies let a
-- logged-in staff session also read the log in-app. Safe to re-run.

-- scan_events should already exist (attendance schema). Create if missing (minimal shape).
create table if not exists public.scan_events (
  id         text primary key,
  member_ref text references public.gym_members(id) on delete set null,
  ts         timestamptz not null default now(),
  device_ts  timestamptz,
  site       text not null default 'main',
  result     text not null default 'granted'
               check (result in ('granted','denied_lapsed','unknown_code')),
  raw_code   text,
  device_id  text,
  excluded   boolean default false,
  created_at timestamptz default now()
);

-- Distinguish manual vs scanned check-ins.
alter table public.scan_events add column if not exists method text default 'scan';

create index if not exists scan_member_ts_idx on public.scan_events(member_ref, ts desc);
create index if not exists scan_ts_idx on public.scan_events(ts desc);

-- RLS: staff can read/write scan_events in-app (the edge function uses service role regardless).
alter table public.scan_events enable row level security;
drop policy if exists scan_events_staff_all on public.scan_events;
create policy scan_events_staff_all on public.scan_events
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

notify pgrst, 'reload schema';
