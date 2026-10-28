-- ============================================================================
-- FIX 2: recipes still read as 0 in the app even though 452 rows exist and a
-- read policy is present. Cause: every policy on public.recipes is scoped to
-- the `authenticated` role, but the app's recipe request is reaching the DB as
-- the `anon` role — so it matches no policy and returns nothing.
--
-- The recipe library is shared, public content (no personal data), so allow the
-- anon role to read SHARED recipes too (same as exercises/programmes). A user's
-- own PRIVATE recipes still require being logged in as that user.
-- Safe + idempotent. Run in Supabase SQL editor.
-- ============================================================================

drop policy if exists recipes_read on public.recipes;

-- `to public` = applies to both anon and authenticated.
-- For anon, auth.uid() is null, so only visibility='shared' rows are returned.
create policy recipes_read on public.recipes
  for select to public
  using ( visibility = 'shared' or created_by = auth.uid() );

notify pgrst, 'reload schema';

-- After running, the Build Your Own planner should show recipes under
-- Lunch/Dinner on reload.
