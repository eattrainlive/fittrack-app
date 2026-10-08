-- Upcoming events for the Community page. Staff create/edit; everyone reads published ones.
create table if not exists public.community_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  event_at    timestamptz,            -- date/time of the event
  location    text,                   -- e.g. "The gym", "Sefton Park"
  link        text,                   -- optional booking / info URL
  image_url   text,                   -- optional banner image
  published   boolean not null default true,
  created_by  uuid,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists community_events_when_idx on public.community_events(event_at);

alter table public.community_events enable row level security;

-- Everyone signed in can read published events; staff can read all + write.
drop policy if exists community_events_read on public.community_events;
create policy community_events_read on public.community_events
  for select to authenticated using (published or public.is_staff());

drop policy if exists community_events_staff_write on public.community_events;
create policy community_events_staff_write on public.community_events
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

notify pgrst, 'reload schema';
