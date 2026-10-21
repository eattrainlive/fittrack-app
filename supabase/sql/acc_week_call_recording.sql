-- Add a per-week "call recording" field to the accountability week content.
-- Holds the Vimeo (or Loom/YouTube) recording of that week's group call, shown
-- on the member's weekly page separately from the teaching video.
-- Idempotent — safe to re-run.

alter table public.acc_week_content
  add column if not exists call_recording_url text;

notify pgrst, 'reload schema';
