-- Lets a single occurrence of a recurring staff reminder be edited/removed
-- without touching the rest of the series: the date is added to `exceptions`
-- (the calendar skips it) and, for an edit, a one-off reminder is created on that
-- day with the changed values. Run once in the Supabase SQL editor.

alter table public.staff_reminders
  add column if not exists exceptions date[] not null default '{}';

notify pgrst, 'reload schema';
