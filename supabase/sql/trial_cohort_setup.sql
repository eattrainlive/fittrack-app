-- Trial cohort — tracks 30-day coached trialists for the "Current Trialists" pipeline board,
-- including whether they converted to a paid membership. Populated by the Quoox webhook.
-- One row per member (by email). Conversion is detected when a PAID membership is added for
-- someone who has a trial row not yet converted.

create table if not exists public.trial_cohort (
  email             citext primary key,
  full_name         text,                          -- member name (from Quoox), so the board doesn't need a join
  trial_product     text,                          -- e.g. "30 Day Trial"
  trial_start       date,                          -- membership.startDateUtc
  trial_end         date,                          -- membership.endDateUtc
  converted         boolean default false,         -- bought a paid membership
  converted_product text,                          -- the paid plan they bought
  converted_at      timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table public.trial_cohort enable row level security;
drop policy if exists trial_cohort_read on public.trial_cohort;
create policy trial_cohort_read on public.trial_cohort
  for select to authenticated using (true);

-- Backfill existing trialists from the roster so the board populates immediately
-- (new joiners are added by the webhook going forward). Trial window = joined_on .. +30 days.
insert into public.trial_cohort (email, full_name, trial_product, trial_start, trial_end)
select lower(email), full_name, product, joined_on, (joined_on + interval '30 days')::date
from public.gym_members
where lower(product) in ('30 day trial', 'forever strong 30 day trial')
  and email is not null
  and joined_on is not null
on conflict (email) do nothing;
