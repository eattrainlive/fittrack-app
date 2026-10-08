-- Fix habit_checkins 42P10 "no unique or exclusion constraint matching the ON CONFLICT".
-- Two upsert paths need matching FULL unique indexes (PostgREST cannot target a partial index):
--   saveHabitCheckin (standard): onConflict (member_id, habit_id, date)
--   trial habit logging:         onConflict (member_id, member_habit_id, date)
-- Run in Supabase. Idempotent.

-- 1) Standard path — ensure a full unique index on (member_id, habit_id, date).
--    (This is the "familiar missing unique index" — the original constraint isn't matching in live.)
create unique index if not exists habit_checkins_member_habit_date_uidx
  on public.habit_checkins (member_id, habit_id, date);

-- 2) Trial path — replace the PARTIAL index (untargetable by upsert) with a FULL one.
drop index if exists habit_checkins_member_mhid_date_uidx;
create unique index if not exists habit_checkins_member_mhid_date_uidx
  on public.habit_checkins (member_id, member_habit_id, date);
-- NULLs are distinct, so nutrition rows (member_habit_id null) aren't constrained here — they're
-- covered by index 1 via habit_id. Trial rows (member_habit_id set) are enforced.

notify pgrst, 'reload schema';

-- If index creation errors on an existing duplicate, de-dupe first, e.g.:
-- delete from public.habit_checkins a using public.habit_checkins b
--   where a.ctid > b.ctid and a.member_id = b.member_id
--     and a.date = b.date and a.habit_id is not distinct from b.habit_id;
