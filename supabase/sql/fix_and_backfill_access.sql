-- ============================================================
-- FIX: setAccess 500 (missing access_override column) + restore/backfill
-- everyone's access from their membership.
-- Safe to re-run. Only touches members NOT on a manual override.
-- ============================================================

-- 1) Ensure the override column exists (this is what setAccess writes).
alter table public.members add column if not exists access_override boolean not null default false;

-- 2) Backfill allowed_access from each member's membership (same rules as the edge function):
--    EVERYONE gets Foundations, Stronger, Fusion, Performance.
--    + Group PT only for a 30-day (PT) trial or a PT membership.
--    NOT Group PT for the 21-for-£21 gym trial, Classes, or gym memberships.
with resolved as (
  select
    m.id as user_id,
    coalesce(gm_link.product, gm_email.product) as product
  from public.members m
  left join public.member_links ml       on ml.user_id = m.id
  left join public.gym_members gm_link   on gm_link.id = ml.member_id
  left join public.gym_members gm_email  on lower(gm_email.email) = lower(m.email)
)
update public.members m
set allowed_access =
  array['Foundations','Stronger','Fusion','Performance']
  || case
       when r.product ~* '21|gym\s*trial'           then array[]::text[]        -- 21-for-£21 gym trial: no Group PT
       when r.product ~* '30\s*day'                 then array['Group PT']      -- 30-day (PT) trial
       when r.product ~* '\ypt\y|semi[ -]?private'  then array['Group PT']      -- PT memberships
       else array[]::text[]                                                     -- Classes, gym, unknown: base four
     end
from resolved r
where r.user_id = m.id
  and coalesce(m.access_override, false) = false;

-- 3) Reload PostgREST schema cache.
notify pgrst, 'reload schema';

-- 4) Verify: show a few members with their membership + resulting access.
select m.full_name, m.email, coalesce(gm_link.product, gm_email.product) as membership,
       m.allowed_access, m.access_override
from public.members m
left join public.member_links ml      on ml.user_id = m.id
left join public.gym_members gm_link  on gm_link.id = ml.member_id
left join public.gym_members gm_email on lower(gm_email.email) = lower(m.email)
order by m.full_name
limit 20;
