-- FitTrack — Attendance / retention module. Run in the Supabase SQL editor.
-- Purpose: capture entry scans, MIRROR membership status from GymOS (never author it),
-- keep full history, and flag members at risk of leaving vs their own baseline.
-- GymOS stays the system of record. Join key = EMAIL (GymOS has no stable ID).

create extension if not exists citext;   -- case-insensitive email

-- ── Members (MIRROR of GymOS + identity spine) ───────────────────────────────
-- One row per member. `id` (member_ref) is the app's stable key; `email` is the
-- join key to GymOS. `status`/`product` are ONLY written by the import job.
create table if not exists public.gym_members (
  id            text primary key,                 -- member_ref (app-stable)
  email         citext unique not null,           -- normalised join key to GymOS
  full_name     text,                             -- display only, never matched on
  product       text,                             -- e.g. 'gym-only' | 'coached' (from GymOS)
  status        text not null default 'unknown'   -- mirrored from GymOS
                  check (status in ('active','cancelled','pending_review','unknown')),
  gymos_status_raw text,                           -- exact value from the export, for audit
  joined_on     date,                              -- tenure start (from GymOS if available)
  ended_on      date,
  auth_uid      uuid references auth.users(id) on delete set null,  -- linked app login (for QR scans)
  scan_token    text unique,                       -- opaque token encoded in the member's QR
  last_import_at timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists gym_members_status_idx on public.gym_members(status);
create index if not exists gym_members_authuid_idx on public.gym_members(auth_uid);

-- ── Effective-dated status history (for tenure / "when did they cancel") ─────
create table if not exists public.membership_status_history (
  id            bigserial primary key,
  member_ref    text not null references public.gym_members(id) on delete cascade,
  status        text not null,
  product       text,
  effective_from date not null,
  source        text default 'gymos_import',
  import_batch  bigint,
  created_at    timestamptz default now()
);
create index if not exists msh_member_idx on public.membership_status_history(member_ref, effective_from desc);

-- ── Scan events (RAW — one row per scan) ─────────────────────────────────────
create table if not exists public.scan_events (
  id            text primary key,                 -- client/device generated (idempotent)
  member_ref    text references public.gym_members(id) on delete set null,
  ts            timestamptz not null,             -- AUTHORITATIVE time (server-stamped on sync)
  device_ts     timestamptz,                      -- what the device thought (for drift checks)
  site          text not null,                    -- 'main' | 'unit_1b'
  result        text not null default 'granted'   -- granted | denied_lapsed | unknown_code
                  check (result in ('granted','denied_lapsed','unknown_code')),
  raw_code      text,                             -- the scanned token/QR payload (for unmatched)
  device_id     text,
  created_at    timestamptz default now()
);
create index if not exists scan_member_ts_idx on public.scan_events(member_ref, ts desc);
create index if not exists scan_ts_idx on public.scan_events(ts desc);
create index if not exists scan_site_idx on public.scan_events(site, ts desc);

-- ── Import batches (audit each weekly upload) ────────────────────────────────
create table if not exists public.import_batches (
  id            bigserial primary key,
  kind          text not null check (kind in ('active','ended')),
  filename      text,
  uploaded_by   uuid references auth.users(id),
  uploaded_at   timestamptz default now(),
  row_count     int, matched int, unmatched int, flagged int,
  notes         text
);

-- ── Configurable flag rules (editable in-app, NO developer) ──────────────────
create table if not exists public.flag_rules (
  id               bigserial primary key,
  name             text not null,
  product          text default 'all',            -- 'all' | 'gym-only' | 'coached'
  baseline_weeks   int  default 10,               -- member's own baseline window
  recent_weeks     int  default 3,                -- window compared against baseline
  drop_pct         numeric default 0.5,           -- flag if recent freq drops >= this vs baseline
  min_baseline_visits int default 6,              -- ignore members without an established pattern
  tenure_grace_days   int default 90,             -- first N days handled separately
  enabled          boolean default true,
  updated_at       timestamptz default now()
);

-- ── Member flags (weekly output + manual overrides that persist) ─────────────
create table if not exists public.member_flags (
  id            bigserial primary key,
  member_ref    text not null references public.gym_members(id) on delete cascade,
  week_of       date not null,                    -- the weekly run this belongs to
  flag_type     text,                             -- e.g. 'attendance_drop','lapsed_still_scanning'
  severity      text default 'watch',             -- watch | at_risk | urgent
  baseline_per_wk numeric, recent_per_wk numeric, -- the numbers behind the flag
  reason        text,
  status        text default 'open'               -- open | overridden | resolved
                  check (status in ('open','overridden','resolved')),
  override_note text,
  overridden_by uuid references auth.users(id),
  overridden_at timestamptz,
  created_at    timestamptz default now(),
  unique (member_ref, week_of, flag_type)
);
create index if not exists member_flags_week_idx on public.member_flags(week_of desc, severity);

-- ── RLS: staff-only module. All tables read/write by authenticated STAFF. ────
-- FitTrack staff is client-gated today; keep these tables to signed-in users and
-- surface them only in the Staff Hub. (Lock to a staff role / service edge fn later.)
do $$ declare t text;
begin
  foreach t in array array['gym_members','membership_status_history','scan_events','import_batches','flag_rules','member_flags']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I_all on public.%I;', t, t);
    execute format('create policy %I_all on public.%I for all to authenticated using (true) with check (true);', t, t);
  end loop;
end $$;

-- Members reading their OWN QR token (for the app to render their code) is fine via gym_members
-- (they only see rows where auth_uid = auth.uid()); if you want to restrict members from reading
-- the whole table, replace gym_members' policy with a split: staff-all + own-row-select.
