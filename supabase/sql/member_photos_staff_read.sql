-- Coaches viewing a client's 6-week progress couldn't see their progress photos
-- (or latest measurements): member_photos / member_measurements only had an
-- owner-only RLS policy (member_id = auth.uid()), so a coach reading another
-- member's rows got nothing back. Add a staff READ policy (same pattern as the
-- food-diary / macros coach views). Owners keep full read/write; staff read-only.
-- Run once in the Supabase SQL editor.

drop policy if exists mp_staff_read on public.member_photos;
create policy mp_staff_read on public.member_photos
  for select to authenticated
  using (public.is_staff());

drop policy if exists mm_staff_read on public.member_measurements;
create policy mm_staff_read on public.member_measurements
  for select to authenticated
  using (public.is_staff());

notify pgrst, 'reload schema';
