-- Staff Hub — more boards: internal announcements, low-stock/supplies, and daily
-- checklists (opening / closing / cleaning). All team-wide, staff-only.
-- Also a staff-read policy on personal_records so the milestones feed (service
-- role) and staff tools can see PBs. Run once in the Supabase SQL editor.

-- ── Announcements ────────────────────────────────────────────────────────────
create table if not exists public.staff_announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  pinned     boolean not null default false,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists staff_announcements_idx
  on public.staff_announcements(pinned desc, created_at desc);
alter table public.staff_announcements enable row level security;
drop policy if exists staff_announcements_staff on public.staff_announcements;
create policy staff_announcements_staff on public.staff_announcements
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ── Supplies / low-stock ─────────────────────────────────────────────────────
create table if not exists public.staff_supplies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,                 -- "Chalk", "Blue roll", "Shaker bottles"
  category   text,                           -- "Cleaning", "Shop", "Gym floor"
  status     text not null default 'ok',     -- ok | low | out
  note       text,
  updated_by text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists staff_supplies_status_idx
  on public.staff_supplies(status, name);
alter table public.staff_supplies enable row level security;
drop policy if exists staff_supplies_staff on public.staff_supplies;
create policy staff_supplies_staff on public.staff_supplies
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ── Daily checklists ─────────────────────────────────────────────────────────
-- Templates = the recurring items; log = one row per item per day it's ticked.
create table if not exists public.checklist_templates (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,                 -- "Wipe down benches"
  section    text not null default 'general', -- opening | closing | cleaning | general
  sort_order int not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists checklist_templates_idx
  on public.checklist_templates(active, section, sort_order);
alter table public.checklist_templates enable row level security;
drop policy if exists checklist_templates_staff on public.checklist_templates;
create policy checklist_templates_staff on public.checklist_templates
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create table if not exists public.checklist_log (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates(id) on delete cascade,
  done_date   date not null default (now()::date),
  done_by     text,
  done_at     timestamptz not null default now()
);
create unique index if not exists checklist_log_once_per_day
  on public.checklist_log(template_id, done_date);
alter table public.checklist_log enable row level security;
drop policy if exists checklist_log_staff on public.checklist_log;
create policy checklist_log_staff on public.checklist_log
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ── Staff read on personal_records (for the milestones feed) ──────────────────
drop policy if exists pr_select_staff on public.personal_records;
create policy pr_select_staff on public.personal_records
  for select to authenticated using (public.is_staff());

notify pgrst, 'reload schema';
