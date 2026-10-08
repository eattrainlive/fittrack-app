-- Member bookings — mirror of Quoox booking events into Supabase, for the trial progress pack
-- (headline "sessions attended" + optional session calendar). Fed by the Quoox booking webhook.
-- Join key to gym_members / trialists = email (Quoox has no stable member id for app auth).

create table if not exists public.member_bookings (
  id                 uuid primary key default gen_random_uuid(),
  email              citext not null,                 -- normalised join key (= gym_members.email)
  gymos_member_id    text,                            -- Quoox member id if present
  external_booking_id text,                           -- Quoox booking id (used to match a later cancel)
  session_id         text,                            -- Quoox session id
  session_at         timestamptz,                     -- session start (payload.session.startTimeLocal)
  session_type       text,                            -- e.g. "Semi Private PT" — lets the pack count coached sessions vs classes
  coach              text,                            -- lead coach, if present
  event_at           timestamptz default now(),       -- when the booking/cancel event fired
  status             text not null default 'booked'
                       check (status in ('booked','attended','cancelled')),
  raw                jsonb,                           -- source payload, for audit / re-parse
  created_at         timestamptz default now()
);

-- Match a cancel back to its booking when Quoox gives a booking id.
-- Use a real UNIQUE CONSTRAINT (not a partial index) so ON CONFLICT / supabase upsert can target it.
-- Postgres allows multiple NULLs under a unique constraint, so id-less rows are still fine.
alter table public.member_bookings
  drop constraint if exists member_bookings_ext_uq;
alter table public.member_bookings
  add constraint member_bookings_ext_uq unique (external_booking_id);
create index if not exists member_bookings_email_idx
  on public.member_bookings(email, session_at);
create index if not exists member_bookings_event_idx
  on public.member_bookings(email, event_at);

-- RLS: mirror the attendance tables (staff/coach read; the webhook writes via service role, bypassing RLS).
alter table public.member_bookings enable row level security;
drop policy if exists member_bookings_all on public.member_bookings;
create policy member_bookings_all on public.member_bookings
  for all to authenticated using (true) with check (true);
