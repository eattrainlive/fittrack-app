-- ============================================================================
-- MULTI-TENANT PHASE 2 — stamp gym_id on the content / engagement / member data
-- ----------------------------------------------------------------------------
-- Adds a `gym_id` column (default 'etl', FK -> gyms) to every tenant-scoped
-- table, plus an index. Purely ADDITIVE and safe:
--   • existing rows backfill to 'etl' automatically (the column default),
--   • NO RLS policy is changed here, so isolation is NOT yet enforced and the
--     live ETL app behaves exactly as before.
-- Run AFTER tenant_phase1_foundations.sql (needs the gyms table + 'etl' row).
--
-- The RLS flip ("gym_id = current_gym_id()") and stamping gym_id on INSERT in
-- the app / edge functions is the SEPARATE Phase 2b step — do that behind a
-- second test tenant and test cross-tenant isolation hard before any real gym.
--
-- Guarded: a table that doesn't exist is skipped, so a partial schema can't
-- break the run. Re-runnable (add column IF NOT EXISTS).
--
-- Deliberately NOT included here (handled separately / out of v1 tenant scope):
--   • feature_settings — needs a composite (gym_id, key) primary key, which
--     touches the xmas-challenge function; do it in its own migration.
--   • retention / finance / accountability (acc_*) tables — stay ETL-only
--     (PT Genius owns that layer); they get gym_id if/when offered beyond ETL.
-- ============================================================================

do $$
declare
  t text;
  tenant_tables text[] := array[
    -- programmes / workouts
    'programme_history','programme_chats','workout_history','custom_workouts',
    'block_scores','personal_records','workout_of_week','wow_results',
    -- challenges / engagement
    'xmas_raffle','erg_challenge_logs','scan_events','fob_entries','evolt_scans',
    'member_habits','habit_checkins','checklist_log','wellness_tracks',
    -- nutrition
    'food_diary','macro_logs','member_macros','member_nutrition','saved_meal_plans',
    'stream_recipes',
    -- member profile
    'member_goals','member_measurements','member_photos','member_emails','par_q',
    'coaching_preferences','trial_goals',
    -- community
    'community_posts','community_comments','community_reactions','community_events',
    'community_event_rsvps',
    -- content / resources
    'resources','resource_sections','content_posts',
    -- staff hub / ops
    'staff_reminders','staff_announcements','staff_events','staff_guides',
    'staff_supplies','coach_notes','staff_trial_stage','equipment_faults',
    -- roster identity
    'gym_members','member_links'
  ];
begin
  foreach t in array tenant_tables loop
    if to_regclass('public.' || t) is null then
      raise notice 'skip (missing): %', t;
      continue;
    end if;
    execute format(
      'alter table public.%I add column if not exists gym_id text not null default ''etl'' references public.gyms(id);',
      t);
    execute format(
      'create index if not exists %I on public.%I(gym_id);',
      t || '_gym_idx', t);
  end loop;
end $$;

-- Verify: every table above should now report a gym_id column, all = 'etl'.
--   select table_name from information_schema.columns
--   where column_name = 'gym_id' and table_schema = 'public' order by table_name;
