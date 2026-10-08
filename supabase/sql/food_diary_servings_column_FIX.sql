-- ============================================================================
-- FIX: food diary items log (toast fires) but don't appear.
-- Cause: the frontend now inserts a `servings` value, but the column was
-- never added, so every insert fails (PostgREST 400: column does not exist)
-- while the toast still says "logged". Add the column + refresh the schema.
-- Run in Supabase SQL editor.
-- ============================================================================
alter table public.food_diary
  add column if not exists servings numeric not null default 1;

notify pgrst, 'reload schema';
