-- Allow the 'parked' outcome: trialists manually moved out of Carla's active
-- nurture list without calling it a win or loss (reversible — clearing the row
-- brings them back). Widens the existing CHECK on trial_outcomes.outcome.
-- Run once in the Supabase SQL editor.

alter table public.trial_outcomes
  drop constraint if exists trial_outcomes_outcome_check;

alter table public.trial_outcomes
  add constraint trial_outcomes_outcome_check
  check (outcome in ('won', 'lost', 'parked'));

notify pgrst, 'reload schema';
