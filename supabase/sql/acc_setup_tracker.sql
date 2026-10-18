-- Accountability — coach-side setup tracker.
-- A per-client grid of onboarding/admin milestones (mirrors the "6 Week Nutrition
-- Members" Google Sheet): Set up on FitTrack, Sent onboarding, Onboarding form,
-- MFP diary open, Paid, Initial call done, Week 1–6 check-ins.
-- The AUTO columns (onboarding form, MFP, weekly check-ins) are derived live from
-- existing data. The MANUAL ticks (set up on FitTrack, sent onboarding, paid,
-- initial call) are stored here as a small jsonb map, e.g.
--   {"setup_fittrack": true, "paid": true}
-- acc_clients RLS already allows the member their own row and staff all rows, so
-- coaches can read/update this with no new policy. Run in Supabase. Safe to re-run.

alter table public.acc_clients
  add column if not exists setup_tracker jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
