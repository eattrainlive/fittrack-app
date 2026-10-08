-- ============================================================================
-- Food diary — a member's logged meals per date (from recipes or quick-add).
-- Server-stored (per member), so it persists and builds a history / week view.
-- Run in Supabase SQL editor.
-- ============================================================================
create table if not exists public.food_diary (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references auth.users(id) on delete cascade,
  date       date not null default current_date,
  meal       text,                              -- 'Breakfast','Lunch','Dinner','Snack' (optional)
  source     text not null default 'recipe',    -- 'recipe' | 'custom'
  recipe_id  uuid references public.recipes(id) on delete set null,
  name       text not null,
  calories   int not null default 0,
  protein    int not null default 0,
  carbs      int not null default 0,
  fats       int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists food_diary_member_date on public.food_diary(member_id, date);

alter table public.food_diary enable row level security;
drop policy if exists food_diary_own on public.food_diary;
create policy food_diary_own on public.food_diary
  for all to authenticated
  using (auth.uid() = member_id) with check (auth.uid() = member_id);

notify pgrst, 'reload schema';
