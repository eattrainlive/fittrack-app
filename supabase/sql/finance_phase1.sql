-- Finance Phase 1 — bank transactions + categories, for the P&L view.
-- Model mirrors PT Genius: each transaction is money in/out, tagged to a category that is
-- itself revenue / expense / owner-draw. Net profit = revenue − expenses.

-- 1) Categories (what a transaction is). kind drives the P&L bucket.
create table if not exists public.transaction_categories (
  name       text primary key,
  kind       text not null check (kind in ('revenue', 'expense', 'owner')),
  sort       int not null default 100
);
alter table public.transaction_categories enable row level security;
drop policy if exists transaction_categories_staff on public.transaction_categories;
create policy transaction_categories_staff on public.transaction_categories
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Sensible defaults for a gym (staff can add/rename later).
insert into public.transaction_categories (name, kind, sort) values
  ('Membership income', 'revenue', 10),
  ('PT income', 'revenue', 20),
  ('Other revenue', 'revenue', 30),
  ('Rent', 'expense', 110),
  ('Wages', 'expense', 120),
  ('Utilities', 'expense', 130),
  ('Equipment', 'expense', 140),
  ('Marketing', 'expense', 150),
  ('Software & subscriptions', 'expense', 160),
  ('Insurance', 'expense', 170),
  ('Stock & supplies', 'expense', 180),
  ('Bank & fees', 'expense', 190),
  ('Other expense', 'expense', 200),
  ('Owner drawings', 'owner', 300)
on conflict (name) do nothing;

-- 2) Bank transactions (one row per line on the statement).
create table if not exists public.bank_transactions (
  id           uuid primary key default gen_random_uuid(),
  txn_date     date not null,
  description  text,
  amount       numeric not null,                 -- always positive; sign comes from direction
  direction    text not null check (direction in ('in', 'out')),
  category     text references public.transaction_categories(name) on delete set null,
  status       text not null default 'needs_review' check (status in ('needs_review', 'coded')),
  excluded     boolean not null default false,   -- e.g. internal transfers, owner top-ups
  import_batch text,                             -- tag per upload so a bad import can be undone
  created_at   timestamptz not null default now()
);
create index if not exists bank_txn_date_idx on public.bank_transactions(txn_date desc);
create index if not exists bank_txn_status_idx on public.bank_transactions(status);

alter table public.bank_transactions enable row level security;
drop policy if exists bank_transactions_staff on public.bank_transactions;
create policy bank_transactions_staff on public.bank_transactions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- 3) Break-even target lives in feature_settings under key 'finance' (no new table).
insert into public.feature_settings (key, value)
  values ('finance', '{"breakEvenMonthly": 0, "ownerPayTarget": 0}'::jsonb)
  on conflict (key) do nothing;

notify pgrst, 'reload schema';
