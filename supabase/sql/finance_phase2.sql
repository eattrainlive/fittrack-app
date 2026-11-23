-- Finance Phase 2 — auto-categorisation rules + revenue-source setting.

-- Rules: when a transaction description contains `match` (case-insensitive), auto-assign
-- `category`. Built as staff categorise payees ("make a rule for Tesco → Stock & supplies"),
-- then applied to every uncoded transaction that matches.
create table if not exists public.transaction_rules (
  id         uuid primary key default gen_random_uuid(),
  match      text not null,
  category   text not null references public.transaction_categories(name) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists transaction_rules_match_idx on public.transaction_rules(lower(match));

alter table public.transaction_rules enable row level security;
drop policy if exists transaction_rules_staff on public.transaction_rules;
create policy transaction_rules_staff on public.transaction_rules
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Add the revenue-source preference to the existing finance settings row.
-- 'mrr'  = P&L revenue comes from membership MRR (no need for every payment in the bank file)
-- 'bank' = P&L revenue comes from bank transactions tagged as revenue
update public.feature_settings
  set value = value || '{"revenueSource": "mrr"}'::jsonb
  where key = 'finance' and not (value ? 'revenueSource');

notify pgrst, 'reload schema';
