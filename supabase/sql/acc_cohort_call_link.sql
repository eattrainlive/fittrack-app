-- Accountability — per-cohort live call link (Wednesdays 12:00).
-- Staff set one link + label per cohort; the member dashboard shows a "Join live
-- call" card. Each future cohort has its own. Run in Supabase. Safe to re-run.

alter table public.acc_cohorts add column if not exists call_url   text;
alter table public.acc_cohorts add column if not exists call_label text default 'Wednesdays 12:00';

-- (acc_cohorts already: authenticated read, staff write — no new RLS needed.)

notify pgrst, 'reload schema';
