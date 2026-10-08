-- ============================================================
-- LAUNCH-DAY SCAN FIX
-- Makes the scan_events table accept everything the check-in edge
-- function inserts, so scans stop silently failing.
-- Safe to re-run.
-- ============================================================

-- 1) Make sure every column the edge function writes actually exists.
alter table public.scan_events add column if not exists user_id     text;
alter table public.scan_events add column if not exists member_name text;
alter table public.scan_events add column if not exists device_ts   timestamptz;
alter table public.scan_events add column if not exists method      text default 'scan';
alter table public.scan_events add column if not exists checkin_for text;
alter table public.scan_events add column if not exists booking_at  timestamptz;
alter table public.scan_events add column if not exists source      text default 'kiosk';
alter table public.scan_events add column if not exists raw_code    text;
alter table public.scan_events add column if not exists device_id   text;

-- 2) Widen the result check constraint to include 'no_membership'
--    (the edge function returns this for a known app user with no
--    matched gym_members row — currently it violates the constraint
--    and blocks the whole insert).
alter table public.scan_events drop constraint if exists scan_events_result_check;
alter table public.scan_events
  add constraint scan_events_result_check
  check (result in ('granted','denied_lapsed','no_membership','unknown_code'));

-- 3) Reload PostgREST's schema cache so the service-role insert sees the columns.
notify pgrst, 'reload schema';

-- 4) Verify: after running, scan once, then check the newest rows.
select id, ts, member_ref, user_id, member_name, result, source
from scan_events
order by ts desc
limit 5;
