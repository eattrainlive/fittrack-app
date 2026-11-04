-- Fix: the app logs body measurements (Progress page → saveBodyweight) straight
-- into bodyweight_history columns — weight, bodyFat, waist, arms, chest, legs —
-- but the table was missing some, so saves failed with
--   PGRST204 "Could not find the 'chest' column of 'bodyweight_history'"
-- and the retry queue re-fired them forever (the 12 errors/24h).
--
-- Add every measurement column the app can send. `if not exists` makes this safe
-- to run whether or not some already exist. Column names match the exact (camelCase)
-- keys the app writes, so PostgREST can map them — note "bodyFat" must be quoted.
-- Run once in the Supabase SQL editor.

alter table public.bodyweight_history
  add column if not exists "bodyFat" numeric,
  add column if not exists waist     numeric,
  add column if not exists arms      numeric,
  add column if not exists chest     numeric,
  add column if not exists legs      numeric,
  add column if not exists thigh     numeric,
  add column if not exists tummy     numeric;

-- Make PostgREST pick up the new columns immediately.
notify pgrst, 'reload schema';
