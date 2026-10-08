-- ============================================================
-- LAUNCH-DAY SCAN DIAGNOSTIC
-- Run each block in the Supabase SQL editor. It tells us whether
-- scans are NOT LANDING (write problem) or landing but NOT SHOWING
-- (read / RLS problem).
-- ============================================================

-- 1) Are scans arriving at all in the last 48h? (write-side check)
select date_trunc('hour', ts) as hour, count(*) as scans
from scan_events
where ts > now() - interval '48 hours'
group by 1
order by 1 desc;

-- 2) Newest raw rows, whatever they are
select id, member_ref, ts
from scan_events
order by ts desc
limit 25;

-- 3) Do those recent scans map to a real member? (join must resolve)
select se.ts, se.member_ref, gm.full_name, gm.email, gm.status
from scan_events se
left join gym_members gm on gm.id = se.member_ref
order by se.ts desc
limit 25;

-- 4) Is the member self-read RLS policy still in place & keyed on member_ref?
select policyname, cmd, qual
from pg_policies
where tablename = 'scan_events';

-- 5) Is there an INSERT policy at all? (if in-app check-in writes scans,
--    a member INSERT with no policy fails silently under RLS)
select policyname, cmd
from pg_policies
where tablename = 'scan_events' and cmd in ('INSERT','ALL');
