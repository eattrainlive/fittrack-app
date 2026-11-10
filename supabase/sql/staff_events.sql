-- Staff-only events / marketing campaign planner (hidden from members). Preplan
-- events, promos and campaigns on a date (or date range); they surface on the
-- Planner calendar and the team "week/month ahead" agenda. Staff RLS only.
-- Run once in the Supabase SQL editor.

create table if not exists public.staff_events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  kind       text not null default 'event',  -- event | campaign | promo | other
  start_date date not null,
  end_date   date,                             -- null = single day
  notes      text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists staff_events_dates_idx
  on public.staff_events(start_date, end_date);

alter table public.staff_events enable row level security;
drop policy if exists staff_events_staff on public.staff_events;
create policy staff_events_staff on public.staff_events
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

notify pgrst, 'reload schema';
