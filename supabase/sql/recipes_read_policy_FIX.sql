-- ============================================================================
-- FIX: recipes come back empty in the app (Build Your Own planner shows 0).
-- Cause: RLS is enabled on public.recipes but no SELECT policy lets people
-- read the shared library. This adds the shared-read policy (and the columns
-- it relies on, if missing). Safe + idempotent — run in Supabase SQL editor.
-- ============================================================================

-- Columns the policy needs (no-ops if already present).
alter table public.recipes
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists visibility text not null default 'shared';

-- Belt-and-braces: make sure every existing recipe is readable.
update public.recipes set visibility = 'shared' where visibility is null;

-- Read policy: anyone signed in can see shared recipes + their own.
alter table public.recipes enable row level security;
drop policy if exists recipes_read on public.recipes;
drop policy if exists recipes_select_all on public.recipes;
create policy recipes_read on public.recipes
  for select to authenticated
  using ( visibility = 'shared' or created_by = auth.uid() );

notify pgrst, 'reload schema';

-- Quick check after running: this should return a non-zero count.
-- select count(*) from public.recipes;
