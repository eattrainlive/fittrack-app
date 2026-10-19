-- Member-saved custom workouts ("My workouts").
-- When a member logs their own (non-programme) session they can save it as a
-- reusable workout to repeat later. Stores the session name + its exercises
-- (same shape the ad-lib logger uses). Past Lifts still resolve by exercise
-- name, so a repeated workout shows previous numbers automatically.
-- Run in Supabase. Safe to re-run.

create table if not exists public.custom_workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid(),
  name       text not null,
  exercises  jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists custom_workouts_user_idx
  on public.custom_workouts (user_id, created_at desc);

alter table public.custom_workouts enable row level security;

-- Each member owns their own saved workouts.
drop policy if exists custom_workouts_own on public.custom_workouts;
create policy custom_workouts_own on public.custom_workouts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

notify pgrst, 'reload schema';
