-- Members can log body MEASUREMENTS (waist, chest, etc.) without a weight — but
-- bodyweight_history.weight was NOT NULL, so those saves failed with 23502 and
-- the retry queue re-sent them forever (the repeated errors from one member).
-- Make weight optional. Existing rows keep their values; measurement-only rows
-- now save fine and the stuck retries clear on their next flush.
-- Run once in the Supabase SQL editor.

alter table public.bodyweight_history
  alter column weight drop not null;

notify pgrst, 'reload schema';
