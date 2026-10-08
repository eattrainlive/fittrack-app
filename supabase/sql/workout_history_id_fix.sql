-- FitTrack — FIX: workout_history saves fail with 400
-- Root cause: workout_history.id is type `uuid`, but the app sends string ids
-- like Date.now().toString() ("1785057024903") → Postgres error 22P02
-- "invalid input syntax for type uuid". Every workout-history upsert is rejected,
-- so logged workouts never persist server-side (and "Last time" can't survive reload).
--
-- Fix: make id `text`, matching every other table in the app (programs,
-- personal_records both use text ids). Run in the Supabase SQL editor.

-- 1. Drop the uuid default (the app always supplies its own id).
alter table public.workout_history alter column id drop default;

-- 2. Convert the column type uuid -> text (existing values convert cleanly).
alter table public.workout_history alter column id type text using id::text;

-- (No new default needed — the client generates the id and upserts on conflict.)

-- Verify:
-- select id, name, date from public.workout_history order by date desc limit 5;
