-- FitTrack — personal_records table (currently MISSING in Supabase → 404 PGRST205)
-- PB basis = heaviest weight lifted for a movement (any reps). reps/date kept for context.
-- Run in the Supabase SQL editor.

create table if not exists public.personal_records (
  id           text primary key,               -- client-generated (Date.now().toString())
  user_id      uuid not null references auth.users(id) on delete cascade,
  exercise     text not null,                  -- exercise NAME (matches how history stores it)
  weight       numeric not null default 0,     -- heaviest weight (kg)
  reps         integer default 0,              -- reps at that weight (context only)
  date         date not null default (now()::date),
  created_at   timestamptz not null default now()
);

-- One PB row per user per exercise (upsert on new heaviest). Enables onConflict upsert.
create unique index if not exists personal_records_user_exercise_uq
  on public.personal_records (user_id, exercise);

create index if not exists personal_records_user_idx
  on public.personal_records (user_id);

alter table public.personal_records enable row level security;

-- RLS: a member only ever touches their own rows.
drop policy if exists "pr_select_own" on public.personal_records;
create policy "pr_select_own" on public.personal_records
  for select using (auth.uid() = user_id);

drop policy if exists "pr_insert_own" on public.personal_records;
create policy "pr_insert_own" on public.personal_records
  for insert with check (auth.uid() = user_id);

drop policy if exists "pr_update_own" on public.personal_records;
create policy "pr_update_own" on public.personal_records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "pr_delete_own" on public.personal_records;
create policy "pr_delete_own" on public.personal_records
  for delete using (auth.uid() = user_id);
