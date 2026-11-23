-- Monthly price for each membership plan, so the Numbers (KPI) dashboard can turn the
-- member roster into revenue figures (MRR, average fee, at-risk revenue). Staff enter a
-- monthly-equivalent price per plan name once; it's matched to gym_members.product.
create table if not exists public.membership_plan_prices (
  plan_name      text primary key,
  monthly_price  numeric not null default 0,
  updated_at     timestamptz not null default now()
);

alter table public.membership_plan_prices enable row level security;

-- Staff manage prices; everyone else has no access (revenue is staff-only).
drop policy if exists membership_plan_prices_staff on public.membership_plan_prices;
create policy membership_plan_prices_staff on public.membership_plan_prices
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

notify pgrst, 'reload schema';
