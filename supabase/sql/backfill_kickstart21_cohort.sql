-- backfill_kickstart21_cohort.sql
-- One-off: pull existing 21-day Kickstart members from gym_members into trial_cohort.
--
-- WHY: the webhook only created trial_cohort rows for the two 30-day coached plans, so every
-- "21 Days For £21" / "21 Day Kickstart" / "21 Day Classes Trial" member is invisible to the
-- Trials hub (Kickstart 21 reads 0). This seeds their rows so they classify + count correctly.
-- The gymos-webhook change handles all NEW Kickstart joins going forward; this is just history.
--
-- Safe to re-run: it only inserts emails not already in trial_cohort and never touches an
-- existing row (so it can't reset an in-flight clock or un-convert anyone).
-- Start of the 21-day window = gym_members.joined_on (fallback: today if that's null).
-- The Trials board drops anyone past day ~35, so long-finished trials seed harmlessly and
-- simply won't show as "active".

insert into public.trial_cohort (email, full_name, trial_product, trial_start, trial_end, updated_at)
select
  gm.email,
  gm.full_name,
  gm.product                                                   as trial_product,
  coalesce(gm.joined_on, current_date)                         as trial_start,
  coalesce(gm.joined_on, current_date) + interval '21 days'    as trial_end,
  now()                                                        as updated_at
from public.gym_members gm
where gm.email is not null
  and gm.product ~ '21'                      -- matches the app's trialType() /21/ test
  and lower(gm.product) not in ('30 day trial', 'forever strong 30 day trial')
  and not exists (
    select 1 from public.trial_cohort tc where tc.email = gm.email
  );

-- Quick check afterwards:
--   select coalesce(trial_product,'(null)') p, count(*) from trial_cohort
--   where trial_start is not null group by 1 order by 2 desc;
