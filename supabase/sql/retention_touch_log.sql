-- Retention nurture: log of WhatsApp "touches" sent to active members from the
-- Retention cockpit (at-risk, slipping, celebrate, PT-credits-low). Drives the
-- cooldown so nobody gets nudged too often, and the "waiting for reply" hold.
-- Staff-only. Run once in the Supabase SQL editor.

create table if not exists public.retention_touch_log (
  id         uuid primary key default gen_random_uuid(),
  email      citext not null,
  touch_key  text not null,              -- e.g. missed_you | slipping | celebrate | pt_low
  template_key text,                     -- GHL approved WhatsApp template fired
  note       text,
  sent_by    text,
  sent_at    timestamptz not null default now()
);
create index if not exists retention_touch_log_email_idx
  on public.retention_touch_log (email, sent_at desc);

alter table public.retention_touch_log enable row level security;

drop policy if exists retention_touch_log_staff on public.retention_touch_log;
create policy retention_touch_log_staff on public.retention_touch_log
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

notify pgrst, 'reload schema';
