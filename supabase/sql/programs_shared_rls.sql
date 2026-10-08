-- Make the coach's PROGRAMMES a shared library: any signed-in member can READ them,
-- but only the owner (coach) can create/edit/delete. Run in the Supabase SQL editor.
-- (Programmes are workout templates, not personal data — safe to share to members.)

alter table public.programs enable row level security;

-- Everyone signed in can READ programmes (the shared library the member app loads).
drop policy if exists programs_read_all on public.programs;
create policy programs_read_all on public.programs
  for select to authenticated using (true);

-- Only the owner (the coach who created it) can WRITE — members never author programmes.
drop policy if exists programs_write_own on public.programs;
create policy programs_write_own on public.programs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Same for the EXERCISE LIBRARY (also account-scoped today — that's why members see
-- wrong names / metres-instead-of-reps: they can't read the coach's exercises).
alter table public.exercises enable row level security;
drop policy if exists exercises_read_all on public.exercises;
create policy exercises_read_all on public.exercises
  for select to authenticated using (true);
drop policy if exists exercises_write_own on public.exercises;
create policy exercises_write_own on public.exercises
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- And the EDUCATION / lesson-video library (also account-scoped — members can't see
-- the coach's education content). Currently empty; fix before adding content.
do $$ declare t text; begin
  foreach t in array array['education_videos','education_folders'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I_read_all on public.%I;', t, t);
    execute format('create policy %I_read_all on public.%I for select to authenticated using (true);', t, t);
    execute format('drop policy if exists %I_write_own on public.%I;', t, t);
    execute format('create policy %I_write_own on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);', t, t);
  end loop;
end $$;

-- Note: the frontend must also stop filtering the programmes query by user_id
-- (see programs_shared_library_PROMPT.md) — RLS alone isn't enough while the app
-- still requests only the logged-in user's rows.
