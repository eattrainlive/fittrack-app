-- ============================================================================
-- Member-created recipes: a member can save their own recipe (e.g. "My Coffee")
-- either PRIVATE (only them) or SHARED (everyone sees it in the library).
-- Existing seeded recipes stay public. Run in Supabase SQL editor.
-- ============================================================================

-- 1. Ownership + visibility columns
alter table public.recipes
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists visibility text not null default 'shared';
-- default 'shared' => all existing/coach-seeded rows remain visible to everyone.
-- member inserts pass visibility explicitly ('private' or 'shared').

alter table public.recipes
  add constraint recipes_visibility_chk check (visibility in ('private','shared')) not valid;
alter table public.recipes validate constraint recipes_visibility_chk;

create index if not exists recipes_created_by on public.recipes(created_by);

-- 2. RLS — replace read-all with "shared + your own"; let members write their own.
--    (Keep whatever staff-write policy already exists for managing the official library.)
alter table public.recipes enable row level security;

drop policy if exists recipes_read on public.recipes;
drop policy if exists recipes_select_all on public.recipes;   -- old read-all name, if present
create policy recipes_read on public.recipes
  for select to authenticated
  using ( visibility = 'shared' or created_by = auth.uid() );

drop policy if exists recipes_insert_own on public.recipes;
create policy recipes_insert_own on public.recipes
  for insert to authenticated
  with check ( created_by = auth.uid() );

drop policy if exists recipes_update_own on public.recipes;
create policy recipes_update_own on public.recipes
  for update to authenticated
  using ( created_by = auth.uid() ) with check ( created_by = auth.uid() );

drop policy if exists recipes_delete_own on public.recipes;
create policy recipes_delete_own on public.recipes
  for delete to authenticated
  using ( created_by = auth.uid() );

notify pgrst, 'reload schema';

-- NOTE: if you had a named staff-write policy (email allowlist) for the official
-- library, it still applies alongside these (policies are OR'd). If a member's
-- shared recipe is ever wrong, staff can still edit/delete it via that policy.
