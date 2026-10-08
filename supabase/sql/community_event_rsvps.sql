-- Event RSVPs: one row per member per event; they can change their answer any time.
-- Run after community_events.sql.
create table if not exists public.community_event_rsvps (
  event_id   uuid not null references public.community_events(id) on delete cascade,
  user_id    uuid not null default auth.uid(),
  status     text not null check (status in ('attending','interested','not_attending')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (event_id, user_id)          -- one answer per person per event (upsert to change)
);
create index if not exists event_rsvps_event_idx on public.community_event_rsvps(event_id, status);

alter table public.community_event_rsvps enable row level security;

-- Everyone signed in can read RSVPs (for counts / social proof); you set only your own.
drop policy if exists rsvps_read on public.community_event_rsvps;
create policy rsvps_read on public.community_event_rsvps
  for select to authenticated using (true);
drop policy if exists rsvps_insert on public.community_event_rsvps;
create policy rsvps_insert on public.community_event_rsvps
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists rsvps_update on public.community_event_rsvps;
create policy rsvps_update on public.community_event_rsvps
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists rsvps_delete on public.community_event_rsvps;
create policy rsvps_delete on public.community_event_rsvps
  for delete to authenticated using (user_id = auth.uid() or public.is_staff());

notify pgrst, 'reload schema';
