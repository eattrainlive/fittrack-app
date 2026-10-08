-- ============================================================================
-- FIX — New members weren't getting "Foundations" access on signup.
-- Cause: public.members.allowed_access default was set to
--   array['Stronger','Fusion','Performance']  (Foundations was omitted —
--   it was written before Foundations existed as a stream).
-- The signup trigger (handle_new_member) inserts a row and relies on this
-- column default, so every new member came out WITHOUT Foundations.
-- Run this in Supabase → SQL Editor.
-- ============================================================================

-- 1) New members: include Foundations in the default access set.
alter table public.members
  alter column allowed_access
  set default array['Foundations','Stronger','Fusion','Performance'];

-- 2) Backfill: add Foundations to every existing member who doesn't have it.
update public.members
set allowed_access = array_append(allowed_access, 'Foundations')
where not ('Foundations' = any(allowed_access));

-- 3) Refresh PostgREST schema cache.
notify pgrst, 'reload schema';

-- Note: Group PT is intentionally still OFF by default — it's a separate
-- paid offering the coach grants manually. Only the four self-serve streams
-- (Foundations, Stronger, Fusion, Performance) are on for new members.
