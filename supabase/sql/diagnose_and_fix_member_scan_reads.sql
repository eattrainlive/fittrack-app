-- Gym visits not counting on the trial/member hub. Two causes: (a) the app queried scan_events by
-- the auth user id instead of gym_members.id (member_ref), and (b) scan_events RLS is staff-only so
-- a member can't read their OWN scans. (a) is a code fix (see brief); (b) is the SQL below.
-- Run STEP 1 first to confirm the scans exist, then STEP 2 to let members read their own.

-- ── STEP 1 (diagnostic) — find YOUR gym_members id and count your scans ─────────────────────
select id as member_ref, email, full_name, product
from public.gym_members
where lower(email) = lower('michael@eattrainlivesmart.co.uk');

-- how many scan_events are stored against that member_ref (use the id from above)
select count(*) as total_scans,
       count(*) filter (where result = 'granted') as granted,
       min(ts) as first_scan, max(ts) as last_scan
from public.scan_events
where member_ref = (
  select id from public.gym_members
  where lower(email) = lower('michael@eattrainlivesmart.co.uk') limit 1
);
-- If total_scans is > 0 here, the data is fine and the problem is the app key + RLS (fix below).
-- If it's 0, the check-in isn't writing scan_events for you (different member_ref / not scanning
-- into this table) — tell me and we'll trace the check-in write path instead.

-- ── STEP 2 (fix RLS) — let a signed-in member READ their own scan_events ────────────────────
-- Keeps existing staff-write policies; ADDS a member self-read. Matches the member to their
-- gym_members row by email (auth email) — adjust to member_links if you key that way.
alter table public.scan_events enable row level security;

drop policy if exists scan_events_member_self_read on public.scan_events;
create policy scan_events_member_self_read on public.scan_events
  for select to authenticated
  using (
    member_ref in (
      select gm.id from public.gym_members gm
      where lower(gm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

notify pgrst, 'reload schema';

-- ── STEP 3 (verify) — as the member, this should now return their scans ─────────────────────
-- (Re-run STEP 1's count after deploying; the app should then show gym visits once the code fix
-- keys on gym_members.id.)
