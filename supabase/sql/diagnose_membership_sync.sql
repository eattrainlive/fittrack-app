-- ─────────────────────────────────────────────────────────────────────────────
-- DIAGNOSTIC ONLY — read-only. Run each block in the Supabase SQL editor and
-- paste the results back. Nothing here changes data.
-- Goal: work out why cancelled members (e.g. Jennie) still show as Active.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Jennie's roster rows. If TWO rows come back (one id = 'email:...', one a
--    numeric Quoox id) with different statuses, that confirms the duplicate-row split.
select id, email, full_name, product, status, joined_on, ended_on,
       gymos_member_id, manual_inactive_at, last_import_at, updated_at
from public.gym_members
where email ilike '%jennietindall123%'
order by updated_at desc;

-- 2) ALL members with more than one roster row for the same email, and whether the
--    statuses disagree. These are the people who can show the wrong status.
select lower(email) as email,
       count(*)                                   as rows,
       array_agg(distinct status)                 as statuses,
       array_agg(id)                              as ids,
       bool_or(status = 'active')                 as has_active,
       bool_or(status = 'cancelled')              as has_cancelled
from public.gym_members
where email is not null
group by lower(email)
having count(*) > 1
order by has_cancelled desc, email;

-- 3) Is Quoox actually sending cancellations? Event types received in the last 90 days.
--    If there are NO cancel/terminate/expire rows here, the webhook isn't getting them.
select event, count(*) as n, max(received_at) as last_seen
from public.webhook_log
where received_at > now() - interval '90 days'
group by event
order by n desc;

-- 4) Any webhook events mentioning Jennie (to see what Quoox sent for her, if anything).
select received_at, event
from public.webhook_log
where (payload::text ilike '%jennietindall123%' or payload::text ilike '%jennie%')
order by received_at desc
limit 20;

-- 5) Roster status counts — the big picture (how many 'active' vs 'cancelled' vs
--    'pending_review' vs 'unknown').
select status, count(*) as members
from public.gym_members
group by status
order by members desc;

-- 6) Jennie's status history (did a cancellation ever get recorded anywhere?).
select *
from public.membership_status_history
where member_ref in (select id from public.gym_members where email ilike '%jennietindall123%')
   or gym_member_id in (select id from public.gym_members where email ilike '%jennietindall123%')
order by created_at desc nulls last;
