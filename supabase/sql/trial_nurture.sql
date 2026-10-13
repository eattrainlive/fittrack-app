-- Trialist nurture sequence — per-trialist log of which steps have been sent.
-- The step catalogue + timing live in the app (src/lib/trialNurture.ts); this
-- table just records what was actually sent (so a step isn't sent twice and the
-- coach sees history). Staff-only.
-- Run in Supabase. Safe to re-run.

create table if not exists public.trial_nurture_log (
  id          uuid primary key default gen_random_uuid(),
  email       citext not null,                 -- the trialist (match key to trial_cohort / GHL)
  step_key    text not null,                   -- which nurture step (app catalogue key)
  template_key text,                           -- GHL WhatsApp template fired
  coach_note  text,                            -- note pushed to the GHL contact field
  sent_by     text,                            -- coach name
  sent_at     timestamptz not null default now()
);

create index if not exists trial_nurture_log_email_idx on public.trial_nurture_log (email, sent_at desc);

alter table public.trial_nurture_log enable row level security;

-- Staff-only (coaches work this list; members never touch it).
drop policy if exists trial_nurture_log_staff on public.trial_nurture_log;
create policy trial_nurture_log_staff on public.trial_nurture_log
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

notify pgrst, 'reload schema';
