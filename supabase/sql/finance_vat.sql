-- Finance — VAT projection + tax pot.
-- Standard scheme: VAT owed = output VAT (on sales) − input VAT (reclaimed on purchases).
-- Each category carries a VAT treatment; VAT is only computed on 'standard' rated items.
-- Amounts on bank transactions are gross (VAT-inclusive), so the VAT element of a gross
-- amount at 20% is amount × 20/120.

alter table public.transaction_categories
  add column if not exists vat_treatment text not null default 'standard'
    check (vat_treatment in ('standard', 'zero', 'exempt', 'none'));

-- Sensible UK gym defaults (staff can change per category):
update public.transaction_categories set vat_treatment = 'exempt'
  where name in ('Rent', 'Insurance', 'Bank & fees');
update public.transaction_categories set vat_treatment = 'none'
  where name in ('Wages', 'Owner drawings');
-- everything else stays 'standard' (memberships, PT, utilities, equipment, marketing, software, stock)

-- VAT settings live in feature_settings 'finance' (rate + whether membership revenue is VATable).
update public.feature_settings
  set value = value
    || (case when value ? 'vatRate' then '{}'::jsonb else '{"vatRate": 20}'::jsonb end)
    || (case when value ? 'revenueVatable' then '{}'::jsonb else '{"revenueVatable": true}'::jsonb end)
  where key = 'finance';

-- Tax pot: a running set-aside. Positive = money added, negative = paid out to HMRC.
create table if not exists public.tax_pot (
  id         uuid primary key default gen_random_uuid(),
  ts         timestamptz not null default now(),
  amount     numeric not null,
  note       text,
  created_by text
);
create index if not exists tax_pot_ts_idx on public.tax_pot(ts desc);
alter table public.tax_pot enable row level security;
drop policy if exists tax_pot_staff on public.tax_pot;
create policy tax_pot_staff on public.tax_pot
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

notify pgrst, 'reload schema';
