-- Trial Hub prerequisites — run in Supabase. Idempotent / safe to re-run.
-- Extends the existing trial_goals table (already has start_weight, sessions_per_week, habit_1..3)
-- and seeds the staff-editable content slot for the hub's videos + review link.
-- Habits chosen in the picker live in the existing member_habits/habit_checkins system
-- (presets seeded from the habit library + "create your own"); trial_goals just carries the
-- month-map fields (goal text, sessions/week) and the setup-complete flag.

-- 1) Map-your-month + setup flag on trial_goals -------------------------------
alter table public.trial_goals
  add column if not exists goal_text  text,      -- "my goal for these 30 days" (free text)
  add column if not exists setup_done boolean not null default false;  -- Step 3 done → show momentum hub

-- (sessions_per_week and start_weight already exist on trial_goals — reused, no change.)

-- 2) Staff-editable content slot for the hub ---------------------------------
-- welcome video, "how to choose habits" helper, and the review booking link.
-- Uses the existing feature_settings table (key/value jsonb, read-all / staff-write).
insert into public.feature_settings (key, value) values (
  'trial_hub',
  '{"welcomeVideoUrl": "", "habitsVideoUrl": "", "reviewBookingUrl": ""}'::jsonb
) on conflict (key) do nothing;

notify pgrst, 'reload schema';
