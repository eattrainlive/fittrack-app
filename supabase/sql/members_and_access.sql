-- ============================================================================
-- FitTrack — Members & programme access
-- Run this in Supabase → SQL Editor. Sets up the members table, auto-creates a
-- member row when someone signs up, and lets each member read their own access.
-- ============================================================================

-- 1) Members table (id = the auth user's id)
create table if not exists public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  -- which programme buckets this member can see: any of
  -- 'Stronger','Fusion','Performance','GroupPT'
  allowed_access text[] not null default array['Stronger','Fusion','Performance'],
  created_at timestamptz not null default now()
);

-- 2) Row-Level Security: a member can read (and only read) their OWN row.
--    Staff management (list all / invite / set access) goes through the
--    manage-members edge function using the service-role key, which bypasses RLS.
alter table public.members enable row level security;

drop policy if exists "members read own row" on public.members;
create policy "members read own row"
  on public.members for select
  using ( auth.uid() = id );

-- 3) Auto-create a member row whenever a new auth user is created
--    (covers BOTH self-signups AND invited users, since an invite creates the
--    auth user). New members default to the three streams, Group PT OFF.
create or replace function public.handle_new_member()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.members (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_member on auth.users;
create trigger on_auth_user_created_member
  after insert on auth.users
  for each row execute function public.handle_new_member();

-- 4) Backfill: create member rows for people who already signed up
insert into public.members (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
from auth.users u
on conflict (id) do nothing;

notify pgrst, 'reload schema';
