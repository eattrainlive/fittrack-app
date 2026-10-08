-- Capture table for incoming GymOS webhooks (so we can see the real payload, then process it).
-- Run in the Supabase SQL editor.

create table if not exists public.webhook_log (
  id          bigserial primary key,
  source      text default 'gymos',
  event       text,                    -- filled once we know where the event/status lives
  headers     jsonb,
  payload     jsonb,                   -- parsed JSON body
  raw_text    text,                    -- raw body (in case it isn't JSON)
  processed   boolean default false,
  received_at timestamptz default now()
);
create index if not exists webhook_log_received_idx on public.webhook_log(received_at desc);

alter table public.webhook_log enable row level security;
-- The edge function writes with the service role (bypasses RLS). Let staff READ to inspect.
drop policy if exists webhook_log_read on public.webhook_log;
create policy webhook_log_read on public.webhook_log for select to authenticated using (true);
