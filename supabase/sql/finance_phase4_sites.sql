-- Finance Phase 4 — site / cost-centre split (24hr gym vs main site vs shared).
-- Lets you see what each unit costs, and is the backbone for the 24hr unit P&L and the
-- VAT business-split later.

-- Which site a transaction belongs to. 'shared' = costs that serve both (e.g. insurance).
alter table public.bank_transactions
  add column if not exists site text not null default 'shared'
    check (site in ('24hr', 'main', 'shared'));
create index if not exists bank_txn_site_idx on public.bank_transactions(site);

-- A category can carry a default site, so tagging a transaction's category auto-sets its site
-- (e.g. "Fob system" → 24hr). Staff can still override per transaction.
alter table public.transaction_categories
  add column if not exists default_site text
    check (default_site in ('24hr', 'main', 'shared'));

notify pgrst, 'reload schema';
