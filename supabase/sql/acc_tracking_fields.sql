-- Accountability — nutrition-tracking visibility (replaces the Everfit→MyFitnessPal link).
-- Per-client tracking config + coach-set targets on acc_clients. The weekly numbers
-- (days logged, avg calories, avg protein, screenshot) ride in acc_checkins.responses
-- (no new table). Run in Supabase. Safe to re-run.

alter table public.acc_clients add column if not exists tracking_app        text;   -- 'mfp' | 'nutracheck' | 'other' | 'none'
alter table public.acc_clients add column if not exists tracking_app_other  text;   -- free text when 'other'
alter table public.acc_clients add column if not exists mfp_username        text;   -- public MyFitnessPal username
alter table public.acc_clients add column if not exists calorie_target      int;    -- coach-set daily kcal target
alter table public.acc_clients add column if not exists protein_target      int;    -- coach-set daily protein (g) target

-- (acc_clients RLS already: own row for the member, staff all. No change.)

notify pgrst, 'reload schema';
