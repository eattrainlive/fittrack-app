-- Workout of the Week + weekly leaderboard. Run in the Supabase SQL editor.

-- The weekly benchmark definition (coach sets one per week).
create table if not exists public.workout_of_week (
  id             text primary key,                 -- client-generated
  name           text not null,                    -- e.g. "The Grinder"
  description    text,                              -- optional notes / format cue (e.g. "3 rounds for time")
  exercises      jsonb,                             -- the built workout: sections + exercise items (same shape as a programme workout), so every movement has its library video demo
  score_type     text not null check (score_type in ('time','reps','distance','calories')),
  scaled_allowed boolean default true,
  week_start     date not null,                     -- Monday it goes live; CURRENT = latest week_start <= today
  created_at     timestamptz default now()
);
create index if not exists wow_week_idx on public.workout_of_week(week_start desc);

-- One result per member per WOW (upsert to keep their best). Score meaning depends on score_type:
--   time = SECONDS (lower is better); reps / distance(metres) / calories = count (higher is better).
create table if not exists public.wow_results (
  id           text primary key,
  wow_id       text not null references public.workout_of_week(id) on delete cascade,
  member_id    uuid not null references auth.users(id) on delete cascade,
  display_name text,                                -- snapshot (first name / handle) for the leaderboard
  gender       text,                                -- 'male' | 'female' | null, for the split
  score        numeric not null,
  scaled       boolean default false,
  created_at   timestamptz default now(),
  unique (wow_id, member_id)
);
create index if not exists wow_results_wow_idx on public.wow_results(wow_id);

alter table public.workout_of_week enable row level security;
alter table public.wow_results     enable row level security;

-- WOW definitions: readable by any signed-in member. WRITES are coach-only —
-- create them via your staff path (the staff edge function / service role, like manage-members),
-- OR add a policy restricting insert/update to your staff user id(s). Leaving read open here:
drop policy if exists wow_read on public.workout_of_week;
create policy wow_read on public.workout_of_week for select to authenticated using (true);

-- Writes: staff hub is client-gated (like programmes/exercises), so allow signed-in writes.
-- (Tighten later to a staff user id or a service-role edge function if you want it locked down.)
drop policy if exists wow_insert on public.workout_of_week;
create policy wow_insert on public.workout_of_week for insert to authenticated with check (true);
drop policy if exists wow_update on public.workout_of_week;
create policy wow_update on public.workout_of_week for update to authenticated using (true) with check (true);
drop policy if exists wow_delete on public.workout_of_week;
create policy wow_delete on public.workout_of_week for delete to authenticated using (true);

-- Results: everyone signed in can READ (that's the leaderboard); a member can only
-- insert/update/delete their OWN row.
drop policy if exists wowr_read on public.wow_results;
create policy wowr_read on public.wow_results for select to authenticated using (true);

drop policy if exists wowr_insert on public.wow_results;
create policy wowr_insert on public.wow_results for insert to authenticated with check (auth.uid() = member_id);

drop policy if exists wowr_update on public.wow_results;
create policy wowr_update on public.wow_results for update to authenticated using (auth.uid() = member_id) with check (auth.uid() = member_id);

drop policy if exists wowr_delete on public.wow_results;
create policy wowr_delete on public.wow_results for delete to authenticated using (auth.uid() = member_id);

-- Note: the leaderboard shows only display_name + gender + score (a snapshot stored on the row),
-- so members never read each other's full member records.
