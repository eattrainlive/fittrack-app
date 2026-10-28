-- ============================================================================
-- Saved meal plans: a member builds a day or a week in the Build Your Own
-- planner and saves the whole thing as a named plan they can reload later.
-- Staff can publish plans to a shared library all members can load.
-- Run in Supabase SQL editor.
-- ============================================================================

create table if not exists public.saved_meal_plans (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete cascade,
  name text not null,
  scope text not null default 'day' check (scope in ('day', 'week')),
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  -- items: [{ dayIndex, meal, source, recipe_id, name, calories, protein, carbs, fats, servings }]
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists saved_meal_plans_owner on public.saved_meal_plans(created_by);
create index if not exists saved_meal_plans_visibility on public.saved_meal_plans(visibility);

alter table public.saved_meal_plans enable row level security;

-- Read: shared library + your own.
drop policy if exists smp_read on public.saved_meal_plans;
create policy smp_read on public.saved_meal_plans
  for select to public
  using ( visibility = 'shared' or created_by = auth.uid() );

-- Insert your own (the app only offers "share to library" to staff).
drop policy if exists smp_insert_own on public.saved_meal_plans;
create policy smp_insert_own on public.saved_meal_plans
  for insert to authenticated
  with check ( created_by = auth.uid() );

-- Update / delete your own.
drop policy if exists smp_update_own on public.saved_meal_plans;
create policy smp_update_own on public.saved_meal_plans
  for update to authenticated
  using ( created_by = auth.uid() ) with check ( created_by = auth.uid() );

drop policy if exists smp_delete_own on public.saved_meal_plans;
create policy smp_delete_own on public.saved_meal_plans
  for delete to authenticated
  using ( created_by = auth.uid() );

notify pgrst, 'reload schema';
