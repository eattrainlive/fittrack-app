-- Align member_habits with the Trial Hub habit code.
-- ROOT CAUSE of "no habits show on the trial page": the trial setup / Edit-Habits code
-- inserts a `habit_name` and upserts with onConflict "member_id, habit_id" / "member_id, habit_name".
-- The member_habits table has neither that column nor those unique constraints, so every
-- upsert throws and is only console.warn'd — setup completes but saves ZERO habits.
-- Run in Supabase. Safe/idempotent.

-- 1) Add the habit_name column (used for custom "create your own" habits, and set for presets too).
alter table public.member_habits
  add column if not exists habit_name text;

-- 2) De-dupe any existing rows before adding unique indexes (keeps the lowest id per group).
delete from public.member_habits a
using public.member_habits b
where a.member_id = b.member_id
  and a.habit_id is not null and b.habit_id is not null
  and a.habit_id = b.habit_id
  and a.id > b.id;

delete from public.member_habits a
using public.member_habits b
where a.member_id = b.member_id
  and a.habit_name is not null and b.habit_name is not null
  and a.habit_name = b.habit_name
  and a.id > b.id;

-- 3) Unique indexes matching the app's onConflict targets.
--    NULLs are distinct by default, so preset rows (non-null habit_id) are enforced by the
--    first index, and custom rows (null habit_id, non-null habit_name) by the second.
create unique index if not exists member_habits_member_habitid_uidx
  on public.member_habits (member_id, habit_id);
create unique index if not exists member_habits_member_habitname_uidx
  on public.member_habits (member_id, habit_name);

notify pgrst, 'reload schema';

-- NOTE — existing trialists: their earlier habit picks were never saved (the upserts failed),
-- so after running this they need to RE-PICK once — reopen the trial setup, or use "Edit habits"
-- on the hub — and the choices will now persist and the rings will populate.

-- FOLLOW-UP (custom habits only): habit_checkins.habit_id is `int references habits(id)`, so a
-- custom (library-less) habit can't be checked in via that FK. Preset habits from the library are
-- unaffected. If you want custom habits to be loggable too, that's a separate small change
-- (allow habit_checkins to reference a member_habits row / relax the FK) — not needed for presets.
