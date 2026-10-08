-- Accountability — add a dedicated Loom URL to weekly check-ins.
-- Until now a coach's Loom link lived inside coach_reply_note (free text). This gives it
-- its own column so the client dashboard + coach console can render a proper play button.
-- Run in Supabase after accountability_schema.sql. Safe to re-run.

alter table public.acc_checkins
  add column if not exists coach_reply_loom_url text;

-- (No RLS change needed — coach_reply_loom_url is covered by the existing acc_checkins_scope
--  policy: staff write, client reads their own.)

notify pgrst, 'reload schema';
