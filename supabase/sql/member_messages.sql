-- WhatsApp conversation mirror — read-only copy of each member's WhatsApp thread,
-- so coaches can read the full conversation on the person's profile in-app without
-- going to GoHighLevel. GHL stays the system of record and the place replies are
-- sent (free-text replies happen there, inside the 24h window; the app deep-links
-- to the GHL thread). This table is just a shown-in-app mirror, fed by the
-- wa-message-sync edge function from GHL inbound + outbound message webhooks.
-- Run in Supabase. Safe to re-run.

create table if not exists public.member_messages (
  id                uuid primary key default gen_random_uuid(),
  email             citext not null,                 -- join key (= gym_members / members email)
  direction         text   not null check (direction in ('in','out')),
  body              text,                             -- message text (free-text or rendered template)
  channel           text   not null default 'whatsapp',
  wa_message_id     text,                             -- provider message id (idempotency)
  template_key      text,                             -- set for outbound approved templates; null for free text
  status            text,                             -- received | sent | delivered | read | failed
  ghl_contact_id    text,                             -- GHL contact id (for the deep-link to the thread)
  ghl_conversation_id text,                           -- GHL conversation id (optional, richer deep-link)
  occurred_at       timestamptz not null default now(),
  raw               jsonb,                            -- source payload, for audit / re-parse
  created_at        timestamptz not null default now()
);

-- Idempotency: never store the same provider message twice. Partial unique so
-- rows without a provider id (rare) are still allowed.
create unique index if not exists member_messages_wa_id_uq
  on public.member_messages (wa_message_id) where wa_message_id is not null;
create index if not exists member_messages_email_idx
  on public.member_messages (email, occurred_at desc);

alter table public.member_messages enable row level security;

-- Staff can READ the thread. Writes are service-role only (the edge function),
-- so there is no insert/update policy for normal users.
drop policy if exists member_messages_staff_read on public.member_messages;
create policy member_messages_staff_read on public.member_messages
  for select to authenticated
  using (public.is_staff());

notify pgrst, 'reload schema';
