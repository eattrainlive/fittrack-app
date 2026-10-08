-- Fix Group PT programmes that ballooned past 6 days/week: strip the EMPTY day-slots that the
-- Repeat seeded (days with no exercises), then set weeks/daysPerWeek from the real content.
-- This breaks the "reverts to 10 days" feedback loop. Run in the Supabase SQL Editor. Safe to re-run.

-- STEP 1 (preview) — GroupPT programmes and how many empty day-rows they carry
select p.name,
       (select count(*) from jsonb_array_elements(p.workouts) w
         where jsonb_array_length(coalesce(w->'exercises','[]'::jsonb)) = 0) as empty_days,
       (select max((w->>'day')::int) from jsonb_array_elements(p.workouts) w) as max_day
from public.programs p
where p.type = 'GroupPT' and p.workouts is not null
order by p.name;

-- STEP 2 (fix) — drop empty day-rows, then set weeks + daysPerWeek from remaining content
update public.programs p
set workouts = cleaned.w,
    weeks = greatest(1, coalesce((select max((x->>'week')::int) from jsonb_array_elements(cleaned.w) x), 1)),
    "daysPerWeek" = greatest(1, coalesce((select max((x->>'day')::int) from jsonb_array_elements(cleaned.w) x), 6))
from (
  select id,
    coalesce(
      (select jsonb_agg(w order by (w->>'week')::int, (w->>'day')::int)
         from jsonb_array_elements(workouts) w
        where jsonb_array_length(coalesce(w->'exercises','[]'::jsonb)) > 0),
      '[]'::jsonb
    ) as w
  from public.programs
  where type = 'GroupPT' and workouts is not null
) cleaned
where p.id = cleaned.id;

-- STEP 3 (verify) — should show 6 days/week and 0 empty days
select p.name, p.weeks, p."daysPerWeek",
       (select count(*) from jsonb_array_elements(p.workouts) w
         where jsonb_array_length(coalesce(w->'exercises','[]'::jsonb)) = 0) as empty_days
from public.programs p
where p.type = 'GroupPT'
order by p.name;

notify pgrst, 'reload schema';
