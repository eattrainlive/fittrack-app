-- ============================================================================
-- MULTI-TENANT PHASE 1 — FOUNDATIONS (safe, additive, no behaviour change)
-- ----------------------------------------------------------------------------
-- Lays the rails for serving other gyms from one app WITHOUT touching how the
-- live ETL app behaves. It:
--   1. creates a `gyms` tenant table (branding + feature config per gym),
--   2. adds `gym_id` to the two identity tables (members, staff_users),
--   3. seeds ETL as tenant #1 and backfills every existing user to it,
--   4. adds a `current_gym_id()` helper that RLS will use later.
-- It deliberately does NOT change any existing RLS policy yet — isolation is
-- flipped on in a later step, once gym_id is on the content tables and tested.
-- Running this on its own is reversible and invisible to members/staff.
-- ============================================================================

-- 1) Tenant table ------------------------------------------------------------
create table if not exists public.gyms (
  id          text primary key,              -- short slug, e.g. 'etl', 'ironworks'
  name        text not null,                 -- internal name
  status      text not null default 'active' check (status in ('active','suspended')),
  -- Branding the app reads to theme itself (logo, colours, app name, domain).
  branding    jsonb not null default '{}'::jsonb,
  -- Per-gym feature flags / defaults (challenge on/off, which streams, etc).
  features    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Seed ETL as the first tenant. Branding values are placeholders — set real ones later.
insert into public.gyms (id, name, branding, features)
values (
  'etl',
  'Eat Train Live Smart',
  '{"app_name":"FitTrack","primary_color":"#10b981","accent_color":"#ef4444","logo_url":null}'::jsonb,
  '{}'::jsonb
)
on conflict (id) do nothing;

-- Anyone signed in can READ gyms (the app needs branding to theme itself).
-- Writes happen through a super-admin/service-role path, never from the client.
alter table public.gyms enable row level security;
drop policy if exists gyms_read on public.gyms;
create policy gyms_read on public.gyms for select to authenticated using (true);

-- 2) Stamp the identity tables ----------------------------------------------
-- Every logged-in user is either a member (members) or staff (staff_users);
-- both reference auth.uid(). gym_id on these two is what resolves a user to a
-- tenant. Default 'etl' so all existing rows belong to ETL automatically.
alter table public.members
  add column if not exists gym_id text not null default 'etl' references public.gyms(id);
alter table public.staff_users
  add column if not exists gym_id text not null default 'etl' references public.gyms(id);

create index if not exists members_gym_idx     on public.members(gym_id);
create index if not exists staff_users_gym_idx on public.staff_users(gym_id);

-- 3) Tenant-resolution helper ------------------------------------------------
-- Returns the gym_id for the current auth user: staff membership wins, then
-- member membership. SECURITY DEFINER so it can read both tables under RLS.
-- RLS policies on the content tables will later read: gym_id = current_gym_id().
create or replace function public.current_gym_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select gym_id from public.staff_users where user_id = auth.uid() limit 1),
    (select gym_id from public.members    where id      = auth.uid() limit 1)
  );
$$;

-- Staff-of-a-specific-gym check, for later tenant-aware RLS on staff tables.
create or replace function public.is_staff_of(p_gym text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_users s
    where s.user_id = auth.uid() and s.gym_id = p_gym
  );
$$;

-- ============================================================================
-- NEXT (not in this file — do after this is in and verified):
--   • Add gym_id to the content + engagement + member-data tables (see
--     claude/multitenant_phase1.md for the categorised list) defaulting 'etl'.
--   • Make feature_settings per-gym (composite key gym_id+key) so each gym
--     toggles its own challenge etc. — touches the xmas-challenge function.
--   • THEN flip RLS on those tables from "authenticated" to
--     "gym_id = current_gym_id()" and test cross-tenant isolation hard.
-- ============================================================================
