-- Trial outcomes — capture WHY a trial ended the way it did (for the dashboard
-- + learning loop). Conversion ("won") is already truthed by trial_cohort.converted;
-- this adds the coach's explicit outcome + a loss reason so we can see where and
-- why trials fall over. One current outcome per trialist email (upsert).
-- Staff-only. Run in Supabase. Safe to re-run.

create table if not exists public.trial_outcomes (
  email       citext primary key,            -- = trial_cohort.email
  outcome     text not null check (outcome in ('won','lost')),
  reason      text,                           -- lost: price | timing | not_for_them | went_elsewhere | other
  note        text,
  decided_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.trial_outcomes enable row level security;

drop policy if exists trial_outcomes_staff on public.trial_outcomes;
create policy trial_outcomes_staff on public.trial_outcomes
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

notify pgrst, 'reload schema';
