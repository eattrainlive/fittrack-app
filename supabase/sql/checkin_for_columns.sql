-- Additive only — you've already run checkin_name_report.sql (member_name/user_id/no_membership).
-- This adds just the "what they checked in for" columns. Safe to re-run.

alter table public.scan_events add column if not exists checkin_for text;   -- e.g. "Semi Private PT", "Open gym", "24 Hour Gym"
alter table public.scan_events add column if not exists booking_at timestamptz;  -- matched booking time, if any
alter table public.scan_events add column if not exists source text default 'kiosk';  -- 'kiosk' | 'paxton'

notify pgrst, 'reload schema';
