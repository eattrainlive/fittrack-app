-- Accountability — per-week habit unlocks (cumulative stack).
-- Maps each programme week to the habit(s) it UNLOCKS, using the existing `habits` library (by id).
-- The member dashboard unlocks all habits for weeks <= current week into member_habits, so the
-- habit rings stack: W1 (2) -> W2 (+1) -> W3 (+1) -> W4 (+1) -> hold through W5-6.
-- Run after the habits library (nutrition_phaseA_schema.sql) exists. Safe to re-run.

create table if not exists public.acc_week_habits (
  id          uuid primary key default gen_random_uuid(),
  week_number int  not null check (week_number between 1 and 6),
  habit_id    int  not null references public.habits(id),
  sort        int  default 0,
  created_at  timestamptz default now(),
  unique (week_number, habit_id)
);

alter table public.acc_week_habits enable row level security;
-- Members read the mapping (to know what to unlock); staff edit.
drop policy if exists acc_week_habits_read on public.acc_week_habits;
create policy acc_week_habits_read on public.acc_week_habits
  for select to authenticated using (true);
drop policy if exists acc_week_habits_staff on public.acc_week_habits;
create policy acc_week_habits_staff on public.acc_week_habits
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ── DEFAULT MAPPING (Michael: confirm/adjust the habit ids to your coaching) ──
-- habits library ids used below:
--   1 = Protein at every meal   2 = Veg at 2+ meals ("plate")   3 = Hydration target
--   4 = Daily steps baseline   13 = Mindful snacking ("planned snacks")
-- Stack: W1 plate+water (2) · W2 +protein (3) · W3 +steps (4) · W4 +planned snacks (5) · W5-6 hold.
insert into public.acc_week_habits (week_number, habit_id, sort) values
  (1, 2, 1),   -- plate  (Veg at 2+ meals)
  (1, 3, 2),   -- water  (Hydration target)
  (2, 1, 3),   -- protein (Protein at every meal)
  (3, 4, 4),   -- steps  (Daily steps baseline)
  (4, 13, 5)   -- planned snacks (Mindful snacking)
on conflict (week_number, habit_id) do nothing;

notify pgrst, 'reload schema';
