-- Add a "dismissed" (manually removed) status to the reach-out / win-back call
-- progress, plus a reopen_at timestamp for the 12-month win-back re-loop (set when
-- a win-back is closed off; the list re-surfaces them once it passes).
-- Run in Supabase. Safe to re-run.

alter table public.staff_contact_progress
  drop constraint if exists staff_contact_progress_status_check;

alter table public.staff_contact_progress
  add constraint staff_contact_progress_status_check
  check (status in (
    'todo','in_progress','done','joined','not_interested','dismissed'
  ));

alter table public.staff_contact_progress
  add column if not exists reopen_at timestamptz;

-- The win-back window the person was last actioned in (e.g. "2-3 months"). The app
-- re-activates a closed-off win-back when they re-appear in a LATER window.
alter table public.staff_contact_progress
  add column if not exists last_window text;

notify pgrst, 'reload schema';
