-- Trim the GymOS/Quoox integration down to ACCESS SYNC only.
-- Keeps: gym_members (roster + has_access) and webhook_log (optional debug).
-- Removes the attendance/retention build (that now lives in Quoox). Run in Supabase SQL editor.

-- 1. Access is driven by gym_members.status (the app computes "isMember" from it) —
--    no extra column needed. The webhook keeps status current: active = member,
--    cancelled / paused = not a member.

-- 2. Stop and remove the weekly flagging job (ignore error if it was never scheduled).
do $$ begin perform cron.unschedule('weekly-atrisk-flags'); exception when others then null; end $$;
drop function if exists public.compute_member_flags(date);

-- 3. Drop the attendance/retention tables (no longer used).
drop table if exists public.member_flags;
drop table if exists public.flag_rules;
drop table if exists public.scan_events;
drop table if exists public.payment_events;
drop table if exists public.membership_status_history;
drop table if exists public.import_batches;

-- gym_members keeps: id, gymos_member_id, email, full_name, product, status, updated_at, ...
-- The app's access gate: a user is a member when their gym_members row (matched by email)
-- has status = 'active'. So the member's FitTrack login email MUST match their Quoox email.
