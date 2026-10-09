-- Accountability onboarding — required-minimum tracking + cohort date move.
-- Run in Supabase SQL editor. Safe to re-run.
--
-- Note on existing fields: `acc_clients.onboarding_done` (boolean) ALREADY exists (added ad-hoc,
-- not previously in a committed migration). It is the legacy "saved onboarding / coach marked
-- onboarded" flag, set by saveMyOnboarding() and the Roster "mark onboarded" toggle. We keep it,
-- and add a stronger, timestamped field for the NEW rule (the 5 required items are present).
-- The coach "mark onboarded" control should set BOTH going forward.

-- Capture the pre-existing ad-hoc column in-repo (no-op if already there).
alter table public.acc_clients add column if not exists onboarding_done boolean default false;

-- New: when the required onboarding minimum (why, front+side photos, weight+3 measurements,
-- baseline avg steps, nutrition approach) has been met.
alter table public.acc_clients add column if not exists onboarding_completed_at timestamptz;

-- One-off data change: move the cohort start to Mon 19 Oct 2026.
update public.acc_cohorts set start_date = '2026-10-19' where name ilike '%accountability%';

notify pgrst, 'reload schema';
