-- Member goals — ongoing (not trial) goal-setting for current members, mirroring trial_goals.
-- Drives progress-vs-goals on the member's home, the monthly recap, the 90-day review, and the
-- engagement/at-risk analytics. Owner-scoped for the member; STAFF can read all (coach hub).
-- Idempotent — safe to re-run. Extended (2026-09) with preset+typed goal, target weight/date, focus areas.

create table if not exists public.member_goals (
  member_id         uuid primary key,              -- auth user id
  start_weight      numeric,                       -- baseline at goal-set
  step_target       int,
  sessions_per_week int,                            -- weekly commitment; the attendance target for scoring
  calorie_target    int,
  habit_1           text,
  habit_2           text,
  habit_3           text,
  focus             text,                          -- their main goal / "why" (free text)
  set_by_coach      text,
  set_at            timestamptz default now(),
  review_due        date,                          -- next 90-day review date (set_at + 90d by default)
  last_review_at    timestamptz,
  updated_at        timestamptz default now()
);

-- New fields (add if the table already exists from the earlier version).
alter table public.member_goals add column if not exists primary_goal text;      -- preset key: fat_loss | strength | fitness | health
alter table public.member_goals add column if not exists goal_text    text;      -- typed "in my words" goal
alter table public.member_goals add column if not exists target_weight numeric;  -- goal weight
alter table public.member_goals add column if not exists target_date   date;     -- event/deadline
alter table public.member_goals add column if not exists focus_areas   text[];   -- body/movement focus tags

-- RLS: member owns their row; staff read everyone.
alter table public.member_goals enable row level security;

drop policy if exists member_goals_own on public.member_goals;
create policy member_goals_own on public.member_goals
  for all to authenticated
  using (auth.uid() = member_id) with check (auth.uid() = member_id);

drop policy if exists member_goals_staff_read on public.member_goals;
create policy member_goals_staff_read on public.member_goals
  for select to authenticated
  using (public.is_staff());

notify pgrst, 'reload schema';
