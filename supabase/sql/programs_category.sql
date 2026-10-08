-- Add a Category/Stream field to programmes so the staff list can group them.
-- Safe to re-run. (Assumes the programmes table is public.programs with a text name column —
-- if your name column is called something else, adjust the backfill's column name.)
alter table public.programs add column if not exists category text;

-- Optional one-time backfill: guess the category from the programme name for existing rows.
-- Order matters (check Group PT / PT after the named streams). Leaves anything unmatched as 'Other'.
update public.programs set category = case
  when name ~* 'foundation'        then 'Foundations'
  when name ~* 'stronger'          then 'Stronger'
  when name ~* 'fusion'            then 'Fusion'
  when name ~* 'performance'       then 'Performance'
  when name ~* 'group\s*pt|group pt' then 'Group PT'
  when name ~* '\mpt\M|pt programme|semi[ -]?private' then 'PT'
  else 'Other'
end
where category is null;

notify pgrst, 'reload schema';

-- Check it:
select category, count(*) from public.programs group by category order by 2 desc;
