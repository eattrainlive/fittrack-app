-- Fix trial habit logging: let check-ins key on the member's habit row, not the library id.
-- ROOT CAUSE: habit_checkins.habit_id is `int references habits(id)`. Trial habits that don't
-- resolve to a library row (custom, or a name-match miss) get habit_id = null and are keyed by
-- the member_habits row id, so the check-in insert violates the FK and fails silently — the ring
-- never counts and stays 0/7. Run in Supabase. Safe/idempotent. Does NOT break the existing
-- nutrition habit flow (it keeps using habit_id).

-- 1) Add a stable per-member key + make library habit_id optional.
alter table public.habit_checkins
  add column if not exists member_habit_id bigint references public.member_habits(id) on delete cascade;

alter table public.habit_checkins
  alter column habit_id drop not null;

-- 2) Uniqueness per member habit per day (for the trial's member_habit_id path).
create unique index if not exists habit_checkins_member_mhid_date_uidx
  on public.habit_checkins (member_id, member_habit_id, date)
  where member_habit_id is not null;

notify pgrst, 'reload schema';

-- After this, the trial hub writes/reads check-ins by member_habit_id (the member_habits row id),
-- which exists for every ring (preset AND custom) — so logging works for all chosen habits.
