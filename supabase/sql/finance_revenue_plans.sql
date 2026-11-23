-- Planned future revenue streams (golf sim, yoga, etc.) for the Forecast.
-- Each adds its monthly amount to projected revenue from its start month (until end_month, if set).
create table if not exists public.revenue_plans (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  monthly_amount numeric not null default 0,
  start_month    text not null,            -- 'YYYY-MM'
  end_month      text,                      -- 'YYYY-MM' or null = ongoing
  site           text not null default 'shared' check (site in ('24hr', 'main', 'shared')),
  note           text,
  created_at     timestamptz not null default now()
);
create index if not exists revenue_plans_start_idx on public.revenue_plans(start_month);

alter table public.revenue_plans enable row level security;
drop policy if exists revenue_plans_staff on public.revenue_plans;
create policy revenue_plans_staff on public.revenue_plans
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

notify pgrst, 'reload schema';
