-- OPTIONAL — cleaner reporting for ad-lib logging. Run in Supabase. Idempotent.
-- Lets activities vs strength sessions be filtered/summed directly instead of reading the
-- data jsonb. Existing rows default to 'strength'. Not required — the app can also just read
-- `type` from the data jsonb — but this makes coach/trial summaries simpler.

alter table public.workout_history
  add column if not exists type text not null default 'strength';  -- 'strength' | 'activity'

-- (Optional convenience columns if you'd rather store activity fields as columns than in jsonb:)
-- alter table public.workout_history add column if not exists activity_type text;
-- alter table public.workout_history add column if not exists distance numeric;
-- alter table public.workout_history add column if not exists distance_unit text;
-- alter table public.workout_history add column if not exists calories int;

notify pgrst, 'reload schema';
