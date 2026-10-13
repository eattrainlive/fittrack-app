-- Fix: trialists (and any newer sign-ups) show as "not on app" because
-- onboarded_at never gets set. "On app" = members.onboarded_at is present, but
-- the client self-stamp (markOnboarded → update members set onboarded_at) is
-- blocked by RLS (members only have a SELECT policy, no UPDATE), so it silently
-- updates 0 rows. This adds a SECURITY DEFINER RPC the client can call to stamp
-- its own onboarded_at safely (only that column, only its own row), plus a
-- one-time backfill for everyone who has already signed in.
-- Run in Supabase. Safe to re-run.

-- 1. RPC: stamp the caller's onboarded_at (idempotent — only when null).
create or replace function public.mark_onboarded()
returns void
language sql
security definer
set search_path = public
as $$
  update public.members
     set onboarded_at = now()
   where id = auth.uid()
     and onboarded_at is null;
$$;

grant execute on function public.mark_onboarded() to authenticated;

-- 2. One-time backfill: anyone whose auth account has ever signed in but whose
--    members.onboarded_at is still null (the self-stamp never worked for them).
--    Uses their actual first/last sign-in time where available, else now().
update public.members m
   set onboarded_at = coalesce(u.last_sign_in_at, now())
  from auth.users u
 where u.id = m.id
   and m.onboarded_at is null
   and u.last_sign_in_at is not null;

notify pgrst, 'reload schema';
