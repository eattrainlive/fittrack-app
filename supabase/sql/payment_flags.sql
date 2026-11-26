-- Payment issue flags — drives the "Payment issues" panel in the Staff Hub.
-- A flag is raised when GymOS fires a "Membership payment failure" or a
-- "Direct debit mandate cancelled" event (see gymos-webhook), or when a staff
-- member adds one manually as a safety net. One OPEN flag per member+issue;
-- Carla works them off (one-tap WhatsApp + mark resolved) so none slip through.

-- 1) Let payment_events record a cancelled mandate alongside failed/successful
--    payments (useful history; the panel itself reads payment_flags).
alter table public.payment_events drop constraint if exists payment_events_result_check;
alter table public.payment_events
  add constraint payment_events_result_check
  check (result in ('failed','success','mandate_cancelled'));

-- 2) The working table the panel reads/writes.
create table if not exists public.payment_flags (
  id            bigserial primary key,
  member_ref    text references public.gym_members(id) on delete cascade,
  email         text,
  full_name     text,
  issue_type    text not null check (issue_type in ('payment_failed','mandate_cancelled')),
  amount        numeric,
  source        text not null default 'gymos' check (source in ('gymos','manual')),
  status        text not null default 'open'  check (status in ('open','resolved')),
  whatsapp_sent boolean not null default false,
  last_outcome  text,
  note          text,
  owner         text,                         -- who last actioned it
  first_seen    timestamptz not null default now(),
  last_event_ts timestamptz not null default now(),
  resolved_by   text,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- One live flag per member per issue type; repeat events update the same row.
  unique (member_ref, issue_type)
);

create index if not exists payment_flags_status_idx on public.payment_flags(status, last_event_ts desc);
create index if not exists payment_flags_email_idx  on public.payment_flags(lower(email));

-- 3) RLS: staff read/write (same model as the other staff-hub tables). The
--    webhook writes with the service role, which bypasses RLS.
alter table public.payment_flags enable row level security;
drop policy if exists payment_flags_staff on public.payment_flags;
create policy payment_flags_staff on public.payment_flags
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());
