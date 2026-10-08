-- RLS for the membership access gate.
-- Goal: a signed-in member can read ONLY their own gym_members row(s) (matched by email),
-- so the app can check their membership status. Staff/coach accounts can read all
-- (for the Admin members roster). Only the backend/webhook writes gym_members.
-- Run in the Supabase SQL editor.

alter table public.gym_members enable row level security;

-- 1) A member can READ their own membership row(s), matched by email (case-insensitive).
drop policy if exists gym_members_read_own on public.gym_members;
create policy gym_members_read_own on public.gym_members
  for select to authenticated
  using ( lower(email) = lower(auth.jwt() ->> 'email') );

-- 2) Staff/coach accounts can READ ALL rows (for the Admin roster).
--    There's no DB role for "staff" (the app uses a passcode flag), so list coach
--    account emails here. ADD every staff email that needs the Admin members view.
drop policy if exists gym_members_read_staff on public.gym_members;
create policy gym_members_read_staff on public.gym_members
  for select to authenticated
  using (
    lower(auth.jwt() ->> 'email') in (
      'michael@eattrainlivesmart.co.uk'
      -- ,'lorraine@eattrainlivesmart.co.uk'   -- add other staff emails here
    )
  );

-- 3) No client writes. The webhook uses the service-role key, which bypasses RLS,
--    so it keeps writing gym_members fine. We deliberately add NO insert/update/delete
--    policy for the authenticated role, so members/coaches can't alter membership from
--    the app — status is owned by Quoox → webhook only.

-- Reload PostgREST schema cache (harmless if not needed).
notify pgrst, 'reload schema';

-- Note: the frontend gate (membership_access_gate_PROMPT.md) fails OPEN if it can't read
-- a row — so until this SQL is applied, no one is locked out; the gate simply won't bite.
