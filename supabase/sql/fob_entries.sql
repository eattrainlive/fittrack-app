-- 24hr gym fob/door entries, imported from the Paxton access log.
-- Each row is an access event; method tells us token (personal fob, identifiable),
-- code (shared PIN, not identifiable) or pin. Used to value the 24hr unit: unique fob
-- users → matched to members → their fees = attributable 24hr revenue.
create table if not exists public.fob_entries (
  id           uuid primary key default gen_random_uuid(),
  ts           timestamptz not null,
  user_name    text,                          -- "Last, First" from Paxton, null for code-only
  token_number text,
  location     text,
  event        text,
  method       text not null default 'other' check (method in ('token', 'code', 'pin', 'other')),
  granted      boolean not null default true,
  import_batch text,
  created_at   timestamptz not null default now(),
  unique (ts, coalesce(user_name, ''), coalesce(location, ''))  -- idempotent re-imports
);
create index if not exists fob_entries_ts_idx on public.fob_entries(ts desc);

alter table public.fob_entries enable row level security;
drop policy if exists fob_entries_staff on public.fob_entries;
create policy fob_entries_staff on public.fob_entries
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

notify pgrst, 'reload schema';
