-- Fix mobility drills wrongly tagged "Weight & Reps" (they should never show a weight field).
-- Uses the enriched movement_pattern to target mobility, sets them to Reps + Time (no weight).
-- Run in the Supabase SQL Editor.

-- STEP 1 (preview) — how many mobility exercises currently carry a weight tag:
select id, name, "trackingType"
from public.exercises
where movement_pattern = 'mobility'
  and "trackingType" ilike '%weight%'
order by name;

-- STEP 2 (fix) — run once the preview looks right:
update public.exercises
set "trackingType" = 'Reps Only, Time Only'
where movement_pattern = 'mobility'
  and "trackingType" ilike '%weight%';

-- verify
select "trackingType", count(*) from public.exercises
where movement_pattern = 'mobility'
group by "trackingType" order by 2 desc;

notify pgrst, 'reload schema';
