-- Accountability Programme — data model (Phase 1 backbone).
-- Fixed cohort (everyone starts the same day), separate programme space, per-client assigned coach.
-- Run in Supabase. Owner/coach-scoped RLS. Safe to re-run.

-- ── Cohort: one 6-week run with a fixed start date ───────────────────────────
create table if not exists public.acc_cohorts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  start_date date not null,
  weeks      int  not null default 6,
  created_at timestamptz default now()
);

-- ── Client enrolled in a cohort, assigned to a coach ─────────────────────────
create table if not exists public.acc_clients (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null,                    -- their app account (auth uid / members.id)
  cohort_id          uuid references public.acc_cohorts(id) on delete cascade,
  coach_user_id      uuid,                             -- assigned staff coach (staff_users.user_id)
  nutrition_approach text default 'plate' check (nutrition_approach in ('plate','tracking')),
  -- onboarding capture
  why          text,
  derailers    text,
  events       text,                                   -- holidays / weddings / deadlines
  baseline     jsonb default '{}'::jsonb,              -- {weight,height,bodyFat,chest,waist,thigh,tummy,steps,photos:[]}
  onboarding   jsonb default '{}'::jsonb,              -- full 42-question onboarding form responses
  step_target  int,                                    -- personal daily step target (set from baseline steps)
  accountability_style text,                           -- Q40: gentle nudges | firm push | data review | group
  checkin_pref text,                                   -- Q41: call | loom | either
  -- programme bookends
  sos_plan         text,                               -- Week 3 "when X, I do Y"
  maintenance_tier text check (maintenance_tier in ('high','middle','low')),  -- Week 6 Sliding Scale
  resign_outcome   text,                               -- Week 6 soft re-sign result
  results          jsonb default '{}'::jsonb,          -- Wk6 outcomes: nps, consents, testimonial, referrals, after photos/measurements
  status       text default 'active' check (status in ('active','completed','withdrawn')),
  enrolled_at  timestamptz default now(),
  unique (user_id, cohort_id)
);
create index if not exists acc_clients_cohort_idx on public.acc_clients(cohort_id);
create index if not exists acc_clients_coach_idx  on public.acc_clients(coach_user_id);

-- ── Weekly check-in (one per client per week; week 0 = onboarding) ────────────
create table if not exists public.acc_checkins (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references public.acc_clients(id) on delete cascade,
  week_number   int not null,                          -- 0..6
  responses     jsonb default '{}'::jsonb,             -- habit scores, wins, non-scale wins, SOS triggers…
  avg_weight    numeric,                               -- computed weekly average
  avg_steps     int,
  submitted_at  timestamptz,
  -- coach reply
  coach_reply_format text check (coach_reply_format in ('call','loom','face','written')),
  coach_reply_note   text,
  coach_replied_at   timestamptz,
  coach_user_id      uuid,
  flagged            boolean default false,            -- safeguarding: concerning content to handle personally
  unique (client_id, week_number)
);
create index if not exists acc_checkins_client_idx on public.acc_checkins(client_id);

-- ── Coach follow-ups (commitments to chase, carried forward until closed) ─────
create table if not exists public.acc_followups (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references public.acc_clients(id) on delete cascade,
  note       text not null,
  created_by uuid,
  created_at timestamptz default now(),
  closed_at  timestamptz
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Cohorts: readable by all signed-in (clients see their start date/week); staff write.
alter table public.acc_cohorts enable row level security;
drop policy if exists acc_cohorts_read on public.acc_cohorts;
create policy acc_cohorts_read on public.acc_cohorts for select to authenticated using (true);
drop policy if exists acc_cohorts_staff on public.acc_cohorts;
create policy acc_cohorts_staff on public.acc_cohorts for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Clients: a client sees/edits their OWN row; staff see/edit all.
alter table public.acc_clients enable row level security;
drop policy if exists acc_clients_own on public.acc_clients;
create policy acc_clients_own on public.acc_clients for all to authenticated
  using (auth.uid() = user_id or public.is_staff())
  with check (auth.uid() = user_id or public.is_staff());

-- Check-ins: client owns their own (via acc_clients.user_id); staff all.
alter table public.acc_checkins enable row level security;
drop policy if exists acc_checkins_scope on public.acc_checkins;
create policy acc_checkins_scope on public.acc_checkins for all to authenticated
  using (public.is_staff() or exists (select 1 from public.acc_clients c where c.id = client_id and c.user_id = auth.uid()))
  with check (public.is_staff() or exists (select 1 from public.acc_clients c where c.id = client_id and c.user_id = auth.uid()));

-- Follow-ups: staff-only (coach tool).
alter table public.acc_followups enable row level security;
drop policy if exists acc_followups_staff on public.acc_followups;
create policy acc_followups_staff on public.acc_followups for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Seed the first cohort (edit the name/date as needed).
insert into public.acc_cohorts (name, start_date, weeks)
select '6 Week Accountability — Oct 2026', date '2026-10-12', 6
where not exists (select 1 from public.acc_cohorts);

notify pgrst, 'reload schema';
