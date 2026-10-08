-- ============================================================================
-- FIX: exercise library won't load on fresh devices / for members (blank Workouts).
-- Cause: the `exercises` table blocks SELECT, so the app can only read the library
-- from a device's local cache. Writes worked (rows exist), reads were blocked.
-- Make the exercise library a SHARED, read-by-all library (it is not per-user data).
-- Run in the Supabase SQL editor.
-- ============================================================================

alter table public.exercises enable row level security;

-- Any logged-in user can READ the whole exercise library.
drop policy if exists exercises_select_all on public.exercises;
create policy exercises_select_all on public.exercises
  for select to authenticated
  using (true);

notify pgrst, 'reload schema';

-- NOTE: this only opens READS. Existing write/insert/update policies are untouched
-- (only you/staff should be editing exercises). If a member ever needs to be blocked
-- from reading, that can be tightened later - but for a coaching app the exercise
-- library is meant to be shared with everyone.
