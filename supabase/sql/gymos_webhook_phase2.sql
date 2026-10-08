-- GymOS webhook — phase 2 tables (real-time roster + payment sync). Run in Supabase SQL editor.
-- Consistent with attendance_retention_schema.sql; safe to run whether or not that ran.

create extension if not exists citext;

-- Membership roster (MIRROR of GymOS). Keyed by the GymOS member id (subject.member.id).
create table if not exists public.gym_members (
  id             text primary key,                 -- member_ref = GymOS member id
  email          citext,
  full_name      text,
  product        text,                             -- membershipPlan (e.g. "Gold Membership")
  status         text not null default 'unknown'
                   check (status in ('active','cancelled','paused','pending_review','unknown')),
  gymos_member_id text,
  gymos_status_raw text,
  joined_on      date,
  ended_on       date,
  auth_uid       uuid references auth.users(id) on delete set null,
  scan_token     text unique,
  last_import_at timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table public.gym_members add column if not exists gymos_member_id text;
alter table public.gym_members add column if not exists email citext;
-- allow 'paused' if the table already existed with the older constraint:
alter table public.gym_members drop constraint if exists gym_members_status_check;
alter table public.gym_members add constraint gym_members_status_check
  check (status in ('active','cancelled','paused','pending_review','unknown'));
create unique index if not exists gym_members_gymosid_uq on public.gym_members(gymos_member_id) where gymos_member_id is not null;
create index if not exists gym_members_email_idx on public.gym_members(email);

-- Effective-dated status history (tenure / "when did they cancel").
create table if not exists public.membership_status_history (
  id            bigserial primary key,
  event_key     text unique,                       -- idempotency
  member_ref    text references public.gym_members(id) on delete cascade,
  status        text not null,
  product       text,
  effective_from date not null,
  source        text default 'gymos_webhook',
  created_at    timestamptz default now()
);
alter table public.membership_status_history add column if not exists event_key text;

-- Payment signals (a failure is a top churn indicator).
create table if not exists public.payment_events (
  id            bigserial primary key,
  event_key     text unique,                       -- idempotency
  member_ref    text references public.gym_members(id) on delete set null,
  gymos_member_id text,
  result        text check (result in ('failed','success')),
  amount        numeric,
  event_type    text,
  event_ts      timestamptz,
  raw           jsonb,
  created_at    timestamptz default now()
);
create index if not exists payment_events_member_idx on public.payment_events(member_ref, event_ts desc);

-- RLS: staff read; the webhook writes with the SERVICE ROLE (bypasses RLS).
do $$ declare t text; begin
  foreach t in array array['gym_members','membership_status_history','payment_events'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I_staff on public.%I;', t, t);
    execute format('create policy %I_staff on public.%I for all to authenticated using (true) with check (true);', t, t);
  end loop;
end $$;
