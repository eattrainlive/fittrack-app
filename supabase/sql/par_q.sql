-- Mandatory PAR-Q (Physical Activity Readiness Questionnaire).
-- Every member must have a valid (completed within the last 12 months) PAR-Q to
-- use the app; the app hard-blocks until it's done, then re-prompts after 12
-- months. A "yes" to any question is flagged for staff but doesn't block.
-- Validity window (12 months) lives in the app so it can be tweaked.
-- Run in Supabase. Safe to re-run.

create table if not exists public.par_q (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null default auth.uid(),
  -- answers: { q1..q7: boolean, details?: text } (question text lives in the app)
  answers       jsonb not null default '{}'::jsonb,
  any_yes       boolean not null default false,     -- flagged for staff follow-up
  declaration_name text,                            -- typed name = signature
  agreed        boolean not null default false,     -- ticked the declaration
  completed_at  timestamptz not null default now()
);

create index if not exists par_q_member_idx on public.par_q (member_id, completed_at desc);

alter table public.par_q enable row level security;

-- A member inserts + reads their own PAR-Qs; staff can read all for oversight.
drop policy if exists par_q_insert_own on public.par_q;
create policy par_q_insert_own on public.par_q
  for insert to authenticated
  with check (member_id = auth.uid());

drop policy if exists par_q_select_own on public.par_q;
create policy par_q_select_own on public.par_q
  for select to authenticated
  using (member_id = auth.uid() or public.is_staff());

-- Staff-only: everyone's latest PAR-Q status (completed date + flag), for the
-- Staff Hub list. Raises for non-staff.
create or replace function public.par_q_status_all()
returns table (member_id uuid, name text, completed_at timestamptz, any_yes boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'staff only';
  end if;
  return query
    select distinct on (p.member_id)
           p.member_id,
           coalesce(m.full_name, m.email, left(p.member_id::text, 8)) as name,
           p.completed_at,
           p.any_yes
    from public.par_q p
    left join public.members m on m.id = p.member_id
    order by p.member_id, p.completed_at desc;
end;
$$;

grant execute on function public.par_q_status_all() to authenticated;

notify pgrst, 'reload schema';
