-- Staff Hub — manual stage overrides for the Trialists call list.
-- -----------------------------------------------------------------------------
-- The Staff Hub "Trialists" tab auto-buckets each trialist from live data
-- (trial_cohort.converted -> Joined, review_bookings -> Booked review). A coach
-- can also MOVE a card by hand when reality is ahead of the data; that manual
-- choice is stored here, keyed by email, and wins over the auto-bucket — EXCEPT
-- a confirmed paid membership (trial_cohort.converted = true) always shows as
-- Joined (ground truth) regardless of any stale override.
--
-- One row per trialist (by email). Staff-only, like the other ops tables.

create table if not exists public.staff_trial_stage (
  email      citext primary key,
  stage      text not null
               check (stage in ('to_contact','booked_review','joined','not_joined')),
  moved_by   text,                         -- coach name who moved it (display only)
  moved_at   timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.staff_trial_stage enable row level security;

-- READ: staff only (matches review_bookings / trial_cohort after hardening).
drop policy if exists staff_trial_stage_read on public.staff_trial_stage;
create policy staff_trial_stage_read on public.staff_trial_stage
  for select to authenticated using (public.is_staff());

-- WRITE (insert / update / delete): staff only. Coaches move cards from the app.
drop policy if exists staff_trial_stage_write on public.staff_trial_stage;
create policy staff_trial_stage_write on public.staff_trial_stage
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Keep updated_at fresh on change.
create or replace function public.touch_staff_trial_stage()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_touch_staff_trial_stage on public.staff_trial_stage;
create trigger trg_touch_staff_trial_stage
  before update on public.staff_trial_stage
  for each row execute function public.touch_staff_trial_stage();
