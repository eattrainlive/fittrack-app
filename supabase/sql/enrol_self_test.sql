-- Enrol yourself into the active accountability cohort so you can view the client dashboard.
-- Test/preview only — run in Supabase SQL editor. Safe to re-run (unique on user_id+cohort).
-- Uses your coach/auth uid as the client user_id and assigns you as your own coach.

insert into public.acc_clients (user_id, cohort_id, coach_user_id, nutrition_approach, why, step_target)
select
  '15a570f0-9c6b-44cd-b07d-16bc6030d4a1',              -- your user_id (auth uid)
  c.id,                                                 -- the seeded Oct-2026 cohort
  '15a570f0-9c6b-44cd-b07d-16bc6030d4a1',              -- assigned coach (you, for the test)
  'plate',
  'Testing the dashboard',
  8000
from public.acc_cohorts c
order by c.start_date desc
limit 1
on conflict (user_id, cohort_id) do nothing;

-- To remove yourself again afterwards:
-- delete from public.acc_clients where user_id = '15a570f0-9c6b-44cd-b07d-16bc6030d4a1';
