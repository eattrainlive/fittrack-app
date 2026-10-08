-- Auto-grant app access based on Quoox membership:
--   PT membership OR any 30-day trial  ->  Foundations + Stronger + Fusion + Group PT
--   everyone else (default)            ->  Foundations + Stronger + Fusion + Performance
-- Applies when a member joins the app (signup trigger) and backfills existing members.
-- Access tokens must match what the app checks (bucketOf): "Group PT" has a SPACE.

-- 1) Helper: the access array for a given email, from their gym_members product.
create or replace function public.member_access_for(p_email text)
returns text[]
language sql stable security definer set search_path = public
as $$
  select case
    when exists (
      select 1 from public.gym_members g
      where lower(g.email) = lower(p_email)
        and (g.product ilike '%30 day trial%' or g.product ilike '%pt%')
    )
    then array['Foundations','Stronger','Fusion','Group PT']
    else array['Foundations','Stronger','Fusion','Performance']
  end;
$$;

-- 2) On signup, set the new member's access from their membership (instead of a fixed default).
create or replace function public.handle_new_member()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.members (id, email, full_name, allowed_access)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    public.member_access_for(new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
-- (trigger on_auth_user_created_member already points at handle_new_member — no change needed.)

-- 3) Backfill existing members: ADD the PT+streams access to anyone who currently qualifies
--    (union, so we never remove access they already had).
update public.members m
set allowed_access = (
  select array(
    select distinct e
    from unnest(coalesce(m.allowed_access, '{}') || array['Foundations','Stronger','Fusion','Group PT']) as e
  )
)
from public.gym_members g
where lower(g.email) = lower(m.email)
  and (g.product ilike '%30 day trial%' or g.product ilike '%pt%');

notify pgrst, 'reload schema';
