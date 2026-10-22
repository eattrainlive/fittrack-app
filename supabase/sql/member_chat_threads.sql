-- Chat inbox: one row per member thread (latest message + who sent it last),
-- for the staff Messages hub. SECURITY DEFINER so staff can read across all
-- members' threads (member_messages is otherwise own-rows / staff-read RLS),
-- with an explicit is_staff() guard so only staff get data back.
-- Run in Supabase. Idempotent.

create or replace function public.member_chat_threads()
returns table (
  email           text,
  name            text,
  last_body       text,
  last_direction  text,
  last_channel    text,
  last_at         timestamptz,
  last_contact_id text,
  last_inbound_at timestamptz,
  msg_count       integer
)
language sql
security definer
set search_path = public
as $$
  with latest as (
    select distinct on (mm.email)
      mm.email, mm.body, mm.direction, mm.channel, mm.occurred_at, mm.ghl_contact_id
    from public.member_messages mm
    order by mm.email, mm.occurred_at desc
  ),
  inbound as (
    select mm.email, max(mm.occurred_at) as last_inbound_at
    from public.member_messages mm
    where mm.direction = 'in'
    group by mm.email
  ),
  counts as (
    select mm.email, count(*)::int as msg_count
    from public.member_messages mm
    group by mm.email
  )
  select
    l.email::text,
    coalesce(gm.full_name, l.email)::text as name,
    l.body,
    l.direction,
    l.channel,
    l.occurred_at,
    l.ghl_contact_id,
    i.last_inbound_at,
    c.msg_count
  from latest l
  left join inbound i on i.email = l.email
  left join counts  c on c.email = l.email
  left join public.gym_members gm on gm.email = l.email
  where public.is_staff()         -- non-staff get an empty result
  order by l.occurred_at desc;
$$;

grant execute on function public.member_chat_threads() to authenticated;

notify pgrst, 'reload schema';
