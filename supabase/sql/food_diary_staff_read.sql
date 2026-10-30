-- ============================================================================
-- Staff read access to member food diaries (view-only).
-- Members keep full control of their own diary (food_diary_own, unchanged).
-- This ADDS a select-only policy so staff (public.is_staff()) can view any
-- member's log in the Staff Hub. Staff still cannot insert/update/delete —
-- there is no staff write policy, so this is read-only by design.
-- Run in Supabase SQL editor.
-- ============================================================================

drop policy if exists food_diary_staff_read on public.food_diary;
create policy food_diary_staff_read on public.food_diary
  for select to authenticated
  using (public.is_staff());

notify pgrst, 'reload schema';
