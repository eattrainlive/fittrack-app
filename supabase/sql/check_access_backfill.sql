-- Did the backfill actually populate allowed_access?

-- A) How many members have empty vs populated access?
select
  count(*)                                           as total_members,
  count(*) filter (where coalesce(array_length(allowed_access,1),0) = 0) as empty_access,
  count(*) filter (where coalesce(array_length(allowed_access,1),0) > 0) as has_access,
  count(*) filter (where access_override)            as on_override
from public.members;

-- B) Spot-check a few rows: membership vs stored access.
select m.full_name, m.email,
       coalesce(gm_link.product, gm_email.product) as membership,
       m.allowed_access, m.access_override
from public.members m
left join public.member_links ml      on ml.user_id = m.id
left join public.gym_members gm_link  on gm_link.id = ml.member_id
left join public.gym_members gm_email on lower(gm_email.email) = lower(m.email)
order by m.full_name
limit 15;
