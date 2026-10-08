-- ============================================================================
-- App settings / feature flags — one shared row of on-off switches for the
-- Nutrition hub sections. Staff toggle them; every member reads them (so a
-- change goes live instantly, no app rebuild). Run in Supabase SQL editor.
-- ============================================================================

create table if not exists public.app_settings (
  id                    int primary key default 1,
  nutrition_calculator  boolean not null default true,   -- Calorie Calculator (live)
  nutrition_progress    boolean not null default true,   -- Progress (live)
  nutrition_habits      boolean not null default false,  -- Habit Tracking (coming soon at launch)
  nutrition_recipes     boolean not null default false,  -- Recipes (coming soon)
  nutrition_meal_plans  boolean not null default false,  -- Meal Plans (coming soon)
  nutrition_education   boolean not null default false,  -- Education (coming soon)
  updated_at            timestamptz not null default now(),
  constraint app_settings_single_row check (id = 1)
);

-- seed the single row
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

alter table public.app_settings enable row level security;

-- Everyone signed in can READ the flags.
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings
  for select to authenticated using (true);

-- Only staff (email allowlist) can UPDATE. Add other staff emails as needed.
drop policy if exists app_settings_write on public.app_settings;
create policy app_settings_write on public.app_settings
  for update to authenticated
  using ( lower(auth.jwt() ->> 'email') in ('michael@eattrainlivesmart.co.uk') )
  with check ( lower(auth.jwt() ->> 'email') in ('michael@eattrainlivesmart.co.uk') );

notify pgrst, 'reload schema';

-- To switch a section on later, either flip it in the Staff Hub, or run e.g.:
--   update public.app_settings set nutrition_habits = true where id = 1;
