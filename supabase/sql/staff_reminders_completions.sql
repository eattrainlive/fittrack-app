-- Per-occurrence completion for recurring reminders.
-- A recurring reminder is one row; ticking a single day's occurrence records
-- that date here instead of rolling the whole series forward, so the tick
-- stays on that day and other occurrences are unaffected. One-off reminders
-- keep using the plain `done` flag.
alter table public.staff_reminders
  add column if not exists completions date[] not null default '{}';

notify pgrst, 'reload schema';
