-- Trial goals — the "starting point" a coached-trial member agrees at induction, plus their
-- start weight. The progress pack measures actual progress AGAINST these targets.
-- One row per member (their current trial goals). Owner-scoped; the coach reads via the
-- progress-summary edge function (service role), not directly.

create table if not exists public.trial_goals (
  member_id         uuid primary key,              -- auth user id
  email             citext,                        -- for staff lookup / join
  start_weight      numeric,                       -- kg at induction
  step_target       int,                           -- daily steps goal
  sessions_per_week int,                           -- target sessions/week
  calorie_target    int,                           -- daily kcal target
  habit_1           text,                          -- the 3 habits agreed with the inducting coach
  habit_2           text,
  habit_3           text,
  set_by_coach      text,                          -- inducting coach name (optional)
  set_at            timestamptz default now(),
  captured_at       timestamptz default now(),     -- completion timestamp (the goals-capture form writes this)
  updated_at        timestamptz default now()
);

alter table public.trial_goals enable row level security;
drop policy if exists trial_goals_own on public.trial_goals;
create policy trial_goals_own on public.trial_goals
  for all to authenticated
  using (auth.uid() = member_id) with check (auth.uid() = member_id);
