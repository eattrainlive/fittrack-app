-- Global feature settings (staff-editable, member-readable) — for launch toggles like the
-- accountability programme card. NOTE: uses a NEW table `feature_settings` (a table named
-- `app_settings` already exists in this project with a different shape). Run in Supabase.

create table if not exists public.feature_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.feature_settings enable row level security;

-- Everyone signed in can READ (members render the card from these values).
drop policy if exists feature_settings_read on public.feature_settings;
create policy feature_settings_read on public.feature_settings
  for select to authenticated using (true);

-- Only staff can WRITE (toggle on/off, set the register link / course route).
drop policy if exists feature_settings_write on public.feature_settings;
create policy feature_settings_write on public.feature_settings
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Seed the accountability programme row (off by default; register link pre-filled).
insert into public.feature_settings (key, value) values (
  'accountability',
  '{"enabled": false, "title": "6 Week Accountability Programme", "startDate": "2026-10-12", "registerUrl": "https://api.leadconnectorhq.com/widget/form/2QhFouEo6lskAJfTtvCk", "courseRoute": ""}'::jsonb
) on conflict (key) do nothing;

notify pgrst, 'reload schema';
