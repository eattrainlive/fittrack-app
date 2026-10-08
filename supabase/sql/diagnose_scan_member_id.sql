-- The live scan_events has member_ref (+ ts), NOT member_id — deployed table differs from the
-- code the builder inspected. This confirms the real schema and reads your scans by member_ref.

-- 0) DEFINITIVE column list — the source of truth for scan_events
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'scan_events'
order by ordinal_position;

-- 1) Your gym_members id
select id as gym_member_id, email
from public.gym_members
where lower(email) = lower('michael@eattrainlivesmart.co.uk');

-- 2) Your scans by member_ref (the real key). All 10 should appear.
select member_ref, result, ts, created_at
from public.scan_events
where member_ref = (
  select id from public.gym_members
  where lower(email) = lower('michael@eattrainlivesmart.co.uk') limit 1
)
order by ts desc
limit 25;

-- 3) Does a member self-read RLS policy already exist, and on which column?
select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'scan_events';
