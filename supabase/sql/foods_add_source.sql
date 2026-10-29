-- Adds a `source` tag so bulk-imported rows (Open Food Facts) are separable
-- from hand-curated rows. Curated rows keep source = NULL.
-- Run once in Supabase SQL editor before the first OFF import.
alter table public.foods add column if not exists source text;

-- Helpful for the importer's re-runnable delete and for filtering in admin.
create index if not exists foods_source_idx on public.foods (source);

notify pgrst, 'reload schema';
