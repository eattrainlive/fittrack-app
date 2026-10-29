-- ============================================================================
-- Food database: a curated, in-app list of foods searched instantly (no external
-- lookup). Covers common UK staples + the brands/products the gym uses/sells.
-- Open Food Facts stays as the fallback for anything not in here.
-- Run in Supabase SQL editor.
-- ============================================================================

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- e.g. "Whey Protein", "Chicken breast"
  brand text,                         -- e.g. "Per4m", "Tesco"; null = generic
  -- macros PER 100g (or per 100ml for drinks)
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fats numeric not null default 0,
  fibre numeric,
  serving_desc text,                  -- e.g. "1 scoop (30g)", "1 slice (40g)"
  serving_g numeric,                  -- grams in one serving
  category text,                      -- optional grouping (dairy, protein, snack…)
  verified boolean not null default true,  -- false = macros not yet confirmed
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Fast, case-insensitive substring search on name + brand.
create extension if not exists pg_trgm;
create index if not exists foods_name_trgm on public.foods using gin (lower(name) gin_trgm_ops);
create index if not exists foods_brand_trgm on public.foods using gin (lower(coalesce(brand,'')) gin_trgm_ops);

alter table public.foods enable row level security;

-- Read: everyone (public content, no personal data).
drop policy if exists foods_read on public.foods;
create policy foods_read on public.foods for select to public using (true);

-- Write: staff only (email allowlist — mirrors the recipes_write staff policy).
drop policy if exists foods_write on public.foods;
create policy foods_write on public.foods for all to authenticated
  using (
    lower((auth.jwt() ->> 'email')) in (
      'michael@eattrainlivesmart.co.uk'
      -- add other staff emails here, comma-separated
    )
  )
  with check (
    lower((auth.jwt() ->> 'email')) in (
      'michael@eattrainlivesmart.co.uk'
    )
  );

notify pgrst, 'reload schema';
