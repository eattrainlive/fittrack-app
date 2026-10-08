-- Data isolation hardening: lock the staff/roster/ops tables to COACHES only, so members can't
-- read other people's data via the API. Members' own personal data is already owner-scoped and
-- is left untouched. Shared libraries (programs/exercises/recipes/education) stay readable.
--
-- Approach: a staff allowlist + is_staff() helper, used by the staff-only tables. The coach app
-- (Michael/Carla logged in) keeps working; members lose access to these tables entirely.

-- 1) Staff allowlist + helper -------------------------------------------------
create table if not exists public.staff_users (
  user_id uuid primary key,
  note    text
);
alter table public.staff_users enable row level security;
drop policy if exists staff_users_read on public.staff_users;
create policy staff_users_read on public.staff_users for select to authenticated using (true);

-- Seed the coach account (Michael). ADD OTHER STAFF below (see note at the bottom).
insert into public.staff_users (user_id, note)
values ('15a570f0-9c6b-44cd-b07d-16bc6030d4a1', 'Michael (coach)')
on conflict (user_id) do nothing;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.staff_users s where s.user_id = auth.uid()); $$;

-- 2) Fix exercise_enrichment (0 policies -> app can't read it) -----------------
drop policy if exists exercise_enrichment_read on public.exercise_enrichment;
create policy exercise_enrichment_read on public.exercise_enrichment
  for select to authenticated using (true);   -- exercise metadata, safe to share like `exercises`

-- 3) Lock staff/roster/ops tables to coaches only -----------------------------
-- READ = staff only. Writes happen via the webhook / edge functions (service role bypasses RLS).
do $$
declare t text;
begin
  foreach t in array array[
    'member_bookings','review_bookings','trial_cohort','gym_members',
    'webhook_log','payment_events','scan_events','membership_status_history',
    'member_flags','flag_rules','coach_notes','error_log'
  ] loop
    -- drop existing permissive policies on the table
    execute format('do $x$ declare p record; begin for p in select polname from pg_policy where polrelid = %L::regclass loop execute format(''drop policy if exists %%I on public.%I'', p.polname); end loop; end $x$;', 'public.'||t, t);
    -- staff-only read
    execute format('create policy %I_staff_read on public.%I for select to authenticated using (public.is_staff());', t, t);
  end loop;
end $$;

-- error_log: also let ANY signed-in user INSERT their own error (client logging), read = staff only.
drop policy if exists error_log_insert on public.error_log;
create policy error_log_insert on public.error_log for insert to authenticated with check (true);

-- gym_members: a member may still read THEIR OWN roster row (getMyGymMember), plus staff read.
drop policy if exists gym_members_read_own on public.gym_members;
create policy gym_members_read_own on public.gym_members
  for select to authenticated using (auth_uid = auth.uid() or lower(email) = lower((auth.jwt() ->> 'email')));

notify pgrst, 'reload schema';

-- ── AFTER RUNNING ────────────────────────────────────────────────────────────
-- Add any OTHER staff/coach accounts so their Staff Hub keeps working. Find a uid by email:
--   select id, email from auth.users where email ilike '%carla%';
-- Then:
--   insert into public.staff_users (user_id, note) values ('<their-uid>', 'Carla') on conflict do nothing;
-- If the coach board/panels go blank for you after this, your uid isn't in staff_users — add it.
