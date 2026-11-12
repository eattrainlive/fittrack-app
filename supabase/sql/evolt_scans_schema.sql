-- Evolt body-scanner history + member alternate-email matching.
--   member_emails : alternate emails linked to a member (staff-added), so scans
--                   (and anything else keyed on email) still match when a member
--                   used a different address elsewhere.
--   evolt_scans   : one row per scan (keyed by Evolt scan ID → re-import never
--                   duplicates). Matched to a member by email.
-- member_emails is created FIRST because the evolt_scans read policy references it.
-- Run once in the Supabase SQL editor.

-- ── Member alternate emails ──────────────────────────────────────────────────
create table if not exists public.member_emails (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      citext not null unique,          -- an email maps to one member
  label      text,                            -- optional note, e.g. "old yahoo"
  added_by   text,
  created_at timestamptz not null default now()
);
create index if not exists member_emails_user_idx on public.member_emails (user_id);

alter table public.member_emails enable row level security;

-- Only STAFF may add/remove linked emails (prevents a member claiming another's
-- email to see their data). Members may read their own linked emails.
drop policy if exists member_emails_staff on public.member_emails;
create policy member_emails_staff on public.member_emails
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists member_emails_read_own on public.member_emails;
create policy member_emails_read_own on public.member_emails
  for select to authenticated
  using (user_id = auth.uid());

-- ── Scans ────────────────────────────────────────────────────────────────────
create table if not exists public.evolt_scans (
  id                text primary key,         -- Evolt scan ID
  scan_at           timestamptz,
  email             citext,
  mobile            text,
  first_name        text,
  last_name         text,
  gender            text,
  age               int,
  location          text,
  height            numeric,
  weight            numeric,
  body_fat_pct      numeric,  -- Percent Body Fat
  bmi               numeric,
  bio_age           numeric,
  bwi               numeric,
  lbm               numeric,  -- lean body mass
  smm               numeric,  -- skeletal muscle mass
  smm_rating        text,
  mineral           numeric,
  protein           numeric,
  whr               numeric,
  tbw               numeric,  -- total body water
  ac                numeric,
  body_fat          numeric,  -- fat mass (kg)
  subcutaneous_fat  numeric,
  visceral_fat      numeric,
  visceral_fat_area numeric,
  systolic          numeric,
  diastolic         numeric,
  pulse             numeric,
  raw               jsonb,    -- everything from the export, verbatim
  created_at        timestamptz not null default now()
);
create index if not exists evolt_scans_email_idx on public.evolt_scans (email, scan_at desc);

alter table public.evolt_scans enable row level security;

-- Staff: full access.
drop policy if exists evolt_scans_staff on public.evolt_scans;
create policy evolt_scans_staff on public.evolt_scans
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Member: read scans matching their login email OR any email staff linked to them.
drop policy if exists evolt_scans_read_own on public.evolt_scans;
create policy evolt_scans_read_own on public.evolt_scans
  for select to authenticated
  using (
    email = (auth.jwt() ->> 'email')::citext
    or email in (select me.email from public.member_emails me where me.user_id = auth.uid())
  );

notify pgrst, 'reload schema';
