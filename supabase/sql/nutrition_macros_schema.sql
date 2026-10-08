-- FitTrack — Nutrition macros: calculator targets + daily self-report
-- Run once in Supabase → SQL Editor. Reuses bodyweight from fittrack_bodyweight (no duplicate).

create table if not exists public.member_macros (
  member_id        uuid primary key references auth.users(id) on delete cascade,
  sex              text check (sex in ('male','female')),
  age              int,
  height_cm        numeric,
  activity_level   text,   -- sedentary | light | moderate | very | athlete
  macro_goal       text check (macro_goal in ('lose','maintain','gain')) default 'maintain',
  calorie_target   int,
  protein_target   int,
  carb_target      int,
  fat_target       int,
  coach_set        boolean default false,   -- true when a coach overrode the numbers
  tracking_enabled boolean default false,
  updated_at       timestamptz default now()
);

create table if not exists public.macro_logs (
  id        bigint generated always as identity primary key,
  member_id uuid references auth.users(id) on delete cascade,
  date      date not null default current_date,
  calories  int,
  protein   int,
  carbs     int,
  fat       int,
  unique (member_id, date)
);
create index if not exists macro_logs_idx on public.macro_logs(member_id, date);

alter table public.member_macros enable row level security;
alter table public.macro_logs    enable row level security;

drop policy if exists mm_macros_own on public.member_macros;
create policy mm_macros_own on public.member_macros for all
  using (member_id = auth.uid()) with check (member_id = auth.uid());

drop policy if exists ml_own on public.macro_logs;
create policy ml_own on public.macro_logs for all
  using (member_id = auth.uid()) with check (member_id = auth.uid());
