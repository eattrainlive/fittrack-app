-- Per-member week offset for the 6-Week Accountability Programme.
-- Lets a staff tester run a week AHEAD of real clients (offset = 1) so they always
-- see the next stage's content/check-in/habits first and can verify it before
-- clients get there. 0 = normal (everyone else). Applied in the app's effective-week
-- calc (effectiveWeekOf). Run in Supabase. Safe to re-run.

alter table public.acc_clients
  add column if not exists week_offset integer not null default 0;

-- Put Michael a week ahead (only affects his own profile). He must be enrolled in
-- the cohort for this to matter; harmlessly updates 0 rows if not yet enrolled.
update public.acc_clients
   set week_offset = 1
 where user_id = (
   select id from public.members
   where lower(email) = lower('michael@eattrainlivesmart.co.uk')
   limit 1
 );

notify pgrst, 'reload schema';
