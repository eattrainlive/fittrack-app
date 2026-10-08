-- ============================================================================
-- FIX: saved programmes exist in Supabase but don't load in the app (only the
-- built-in defaults show). Cause: the `programs` table blocks SELECT (RLS), so
-- the app can't read them on a fresh device / after clearing cache.
-- Let each user READ their own programmes. Run in the Supabase SQL editor.
-- ============================================================================

alter table public.programs enable row level security;

drop policy if exists programs_select_own on public.programs;
create policy programs_select_own on public.programs
  for select to authenticated
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';

-- NOTE: this opens READS of a user's OWN programmes (auth.uid() = user_id).
-- Existing insert/update policies are untouched. (Assigning programmes to
-- members so THEY can read them is a separate, later step.)
