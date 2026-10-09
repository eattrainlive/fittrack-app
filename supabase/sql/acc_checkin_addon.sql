-- Accountability — week-specific check-in question (+ seed for the Oct 2026 cohort).
-- Run in Supabase SQL editor. Safe to re-run.

alter table public.acc_week_content add column if not exists checkin_addon text;

update public.acc_week_content set checkin_addon = case week_number
  when 1 then 'Which meal was easiest to build as a balanced plate this week?'
  when 2 then 'Which protein swap worked best for you?'
  when 3 then 'What''s helped you most so far?'
  when 4 then 'Your go-to snack now, and your plan when a craving hits?'
  when 5 then 'What''s clicked that you didn''t expect at the start?'
  else checkin_addon end
where week_number between 1 and 5;

notify pgrst, 'reload schema';
