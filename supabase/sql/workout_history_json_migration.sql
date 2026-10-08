-- ============================================================================
-- workout_history — store each session as a single JSON blob (data column)
-- so newly-added workout fields can never break saving again.
-- Run in Supabase → SQL Editor.
-- ============================================================================

-- 1) Ensure the table exists with the right shape.
--    id is TEXT because the app generates string ids (Date.now().toString()).
create table if not exists public.workout_history (
  id       text primary key,
  user_id  uuid not null references auth.users(id) on delete cascade,
  date     timestamptz not null default now(),
  data     jsonb
);

-- 2) If the table already existed, add the JSON column.
alter table public.workout_history add column if not exists data jsonb;

-- 3) Row-Level Security: each member can read/write ONLY their own rows.
alter table public.workout_history enable row level security;

drop policy if exists wh_own on public.workout_history;
create policy wh_own on public.workout_history
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4) Refresh the API schema cache.
notify pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- CHECK (important): the app sends string ids, so the id column MUST be text.
-- If workout_history.id is currently uuid, saves will still be rejected.
-- Verify with:
--   select data_type from information_schema.columns
--   where table_name = 'workout_history' and column_name = 'id';
-- If it returns 'uuid', tell me and I'll give you the safe conversion steps
-- (changing a primary-key type needs a couple of extra lines).
-- ----------------------------------------------------------------------------
