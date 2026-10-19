-- Accountability — client-facing "This week's focus".
-- A short written round-up the coach sets for each week (what you agreed to work
-- on), shown to the CLIENT on their own accountability dashboard so they can
-- re-read and refresh on it through the week. One per client per week.
-- Distinct from acc_coach_notes (private coach log) and acc_checkins
-- (the client's weekly submission + the coach's reply to it).
-- Run in Supabase. Safe to re-run.

create table if not exists public.acc_client_focus (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.acc_clients(id) on delete cascade,
  week_number int  not null,                       -- 1..6 (0 = pre-start, if ever used)
  body        text not null,
  updated_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (client_id, week_number)
);

create index if not exists acc_client_focus_client_idx
  on public.acc_client_focus (client_id, week_number);

alter table public.acc_client_focus enable row level security;

-- SELECT: the client reads their OWN weeks (via acc_clients.user_id); staff all.
drop policy if exists acc_client_focus_read on public.acc_client_focus;
create policy acc_client_focus_read on public.acc_client_focus
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.acc_clients c
      where c.id = client_id and c.user_id = auth.uid()
    )
  );

-- WRITE (insert/update/delete): staff only — the client never edits it.
drop policy if exists acc_client_focus_write on public.acc_client_focus;
create policy acc_client_focus_write on public.acc_client_focus
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

notify pgrst, 'reload schema';
