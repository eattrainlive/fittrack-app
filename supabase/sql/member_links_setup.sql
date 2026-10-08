-- Member linking: connect an app account to its Quoox roster row when the emails differ.
-- The Sync matches on email, so anyone who joined the app with a different email than Quoox has
-- (gmail vs googlemail, Apple hide-my-email relays, a work vs personal address) shows "no membership".
-- This adds a persistent link the coach confirms once; every future sync stays linked.
--
-- Run in Supabase SQL editor. Safe to re-run.

-- 1) The link table: one app user → one roster row.
create table if not exists public.member_links (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  member_id text not null references public.gym_members(id) on delete cascade,
  linked_by uuid,
  linked_at timestamptz not null default now()
);
create index if not exists member_links_member_id_idx on public.member_links (member_id);

-- 2) Staff-only (same is_staff() gate the roster uses).
alter table public.member_links enable row level security;
drop policy if exists member_links_staff_all on public.member_links;
create policy member_links_staff_all on public.member_links
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- 3) Email normaliser — collapses gmail/googlemail, gmail dots, and +tags so those auto-match
--    on the NEXT sync without any manual linking. (Apple relay addresses can't be reversed —
--    those still need a manual link via the panel.)
create or replace function public.norm_email(p text)
returns text language sql immutable as $$
  with e as (select lower(trim(coalesce(p,''))) as s),
  parts as (
    select case when position('@' in s) > 0 then split_part(s,'@',1) else s end as local,
           case when position('@' in s) > 0 then split_part(s,'@',2) else '' end as dom
    from e
  )
  select case
    when dom = '' then local
    else
      case when dom in ('gmail.com','googlemail.com')
           then replace(split_part(local,'+',1),'.','')
           else split_part(local,'+',1)
      end
      || '@' ||
      case when dom = 'googlemail.com' then 'gmail.com' else dom end
  end
  from parts;
$$;

-- 4) Access resolver that reads THROUGH links and normalised email.
--    Returns the access array for an app user: PT / 30-day-trial → PT streams, else default.
create or replace function public.member_access_for_user(p_user_id uuid, p_email text)
returns text[] language sql stable security definer set search_path = public
as $$
  select case
    when exists (
      select 1
      from public.gym_members g
      left join public.member_links l on l.member_id = g.id
      where (
              public.norm_email(g.email) = public.norm_email(p_email)
              or l.user_id = p_user_id
            )
        and (g.product ilike '%30 day trial%' or g.product ilike '%pt%')
    )
    then array['Foundations','Stronger','Fusion','Group PT']
    else array['Foundations','Stronger','Fusion','Performance']
  end;
$$;

-- 5) Keep signup using the link-aware + normalised resolver.
create or replace function public.handle_new_member()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.members (id, email, full_name, allowed_access)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    public.member_access_for_user(new.id, new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 6) Backfill: ADD PT-stream access to anyone who qualifies via normalised email OR a link
--    (union — never removes access they already had).
update public.members m
set allowed_access = (
  select array(select distinct e
    from unnest(coalesce(m.allowed_access,'{}') || array['Foundations','Stronger','Fusion','Group PT']) as e)
)
where exists (
  select 1
  from public.gym_members g
  left join public.member_links l on l.member_id = g.id
  where (public.norm_email(g.email) = public.norm_email(m.email) or l.user_id = m.id)
    and (g.product ilike '%30 day trial%' or g.product ilike '%pt%')
);

notify pgrst, 'reload schema';
