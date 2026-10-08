-- Conditioning / Freestyle block SCORES — a dedicated, rankable home for AMRAP / For Time / EMOM /
-- Freestyle results, so leaderboards can sort across members (the scores also stay embedded in
-- workout_history for the session record; this table is the queryable copy).
-- Run in the Supabase SQL Editor. Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.block_scores (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workout_id   text,                 -- the workout_history session id (for dedupe + linking)
  program_id   text,                 -- programme this block belongs to
  section_id   text,                 -- the conditioning/freestyle section id
  section_title text,                -- e.g. "Conditioning — Press & Row Couplet"
  block_type   text,                 -- 'AMRAP' | 'For Time' | 'EMOM' | 'Freestyle'
  score_type   text,                 -- 'rounds' | 'reps' | 'time' | 'complete'
  rounds       integer,
  reps         integer,
  time_secs    integer,
  completed    boolean,
  -- Normalised so DESC always = best (leaderboards just `order by sort_value desc`):
  --   AMRAP/rounds  -> rounds*1000 + reps
  --   reps          -> reps
  --   time          -> -time_secs   (faster = higher)
  --   EMOM complete -> 1 / 0
  sort_value   numeric,
  stream       text,
  week         integer,
  day          integer,
  is_leaderboard boolean default false,   -- this block is a ranked leaderboard workout
  leaderboard_title text,                 -- display name for the board (e.g. "Long Engine — Leaderboard")
  logged_on    date default (now() at time zone 'utc')::date,
  created_at   timestamptz default now(),
  unique (workout_id, section_id)    -- one score per block per logged session
);

-- Add newer columns if the table already existed from an earlier run (create-if-not-exists
-- above won't add columns to an existing table).
alter table public.block_scores add column if not exists is_leaderboard boolean default false;
alter table public.block_scores add column if not exists leaderboard_title text;

alter table public.block_scores enable row level security;

-- Leaderboards are shared within the gym: any authenticated user may READ all scores,
-- but may only write their OWN. (Mirrors the Workout-of-the-Week results pattern.)
drop policy if exists block_scores_select on public.block_scores;
create policy block_scores_select on public.block_scores
  for select to authenticated using (true);

drop policy if exists block_scores_insert on public.block_scores;
create policy block_scores_insert on public.block_scores
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists block_scores_update on public.block_scores;
create policy block_scores_update on public.block_scores
  for update to authenticated using (user_id = auth.uid());

drop policy if exists block_scores_delete on public.block_scores;
create policy block_scores_delete on public.block_scores
  for delete to authenticated using (user_id = auth.uid());

-- Leaderboard read path: scores for one section, best first.
create index if not exists block_scores_section_idx on public.block_scores (section_id, sort_value desc);
-- Leaderboard boards only.
create index if not exists block_scores_leaderboard_idx on public.block_scores (is_leaderboard, section_id, sort_value desc) where is_leaderboard;
-- A member's own history.
create index if not exists block_scores_user_idx on public.block_scores (user_id, created_at desc);
-- Programme-wide boards.
create index if not exists block_scores_program_idx on public.block_scores (program_id, section_id);

notify pgrst, 'reload schema';
