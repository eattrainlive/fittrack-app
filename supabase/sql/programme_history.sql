-- Cross-chat memory for the coach agent.
-- Every programme committed via "Open in editor" (the coach-agent `structure` action)
-- writes one compact "history card" here. On every new chat turn the agent loads the
-- most recent cards for that stream (and member, if programming for one) and is told to
-- progress from them — so a brand-new chat automatically knows what was built before.
-- Run once in Supabase SQL Editor. Safe to re-run (idempotent).

create table if not exists public.programme_history (
  id          uuid primary key default gen_random_uuid(),
  stream      text,
  member_id   text,                       -- null = general stream programme
  title       text,
  summary     text,                       -- compact one-line-per-day card (built by the function)
  draft       jsonb,                       -- full structured programme, for reference/reload
  chat_id     uuid,
  created_at  timestamptz not null default now()
);

create index if not exists programme_history_stream_idx on public.programme_history (stream, created_at desc);
create index if not exists programme_history_member_idx on public.programme_history (member_id, created_at desc);

alter table public.programme_history enable row level security;

-- Staff-only (mirrors the rest of the coach-agent schema). The edge function uses the
-- service role and bypasses RLS for writes/reads; these policies are for any direct client access.
drop policy if exists programme_history_staff_all on public.programme_history;
create policy programme_history_staff_all on public.programme_history
  for all using (public.is_staff()) with check (public.is_staff());

notify pgrst, 'reload schema';
