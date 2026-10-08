-- Let ANY staff member (in staff_users) create/edit the shared coach library — not just the
-- original owner. Fixes: a second coach (e.g. JJ) can't save a programme ("failed to save to
-- cloud") because the old policy required auth.uid() = user_id (owner-only).
-- Members still only READ (read-all policies unchanged). Run in the Supabase SQL editor.

-- PROGRAMMES
drop policy if exists programs_write_own on public.programs;
drop policy if exists programs_write_staff on public.programs;
create policy programs_write_staff on public.programs
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- EXERCISE LIBRARY
drop policy if exists exercises_write_own on public.exercises;
drop policy if exists exercises_write_staff on public.exercises;
create policy exercises_write_staff on public.exercises
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- EDUCATION / RESOURCE LIBRARY (guard: only if the tables exist)
do $$ declare t text; begin
  foreach t in array array['education_videos','education_folders','resources','resource_sections'] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop policy if exists %I_write_own on public.%I;', t, t);
      execute format('drop policy if exists %I_write_staff on public.%I;', t, t);
      execute format('create policy %I_write_staff on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff());', t, t);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

-- Note: read-all policies (members reading the shared library) are left as-is.
-- Any signed-in STAFF can now author/edit; members still can't write.
