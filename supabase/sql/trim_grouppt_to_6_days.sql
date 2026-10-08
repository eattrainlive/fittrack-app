-- Trim over-generated Group PT programmes (more than 6 days/week) down to days 1-6.
-- DESTRUCTIVE: removes day-rows 7+ (their content is deleted). Only affects GroupPT programmes
-- whose max day > 6, so a correct 6-day programme is untouched. Run in the Supabase SQL Editor.

-- STEP 1 (preview) — which GroupPT programmes would be trimmed
select p.name,
       (select max((w->>'day')::int) from jsonb_array_elements(p.workouts) w) as max_day
from public.programs p
where p.type = 'GroupPT' and p.workouts is not null
  and (select max((w->>'day')::int) from jsonb_array_elements(p.workouts) w) > 6
order by p.name;

-- STEP 2 (trim) — keep only days 1-6, reset weeks/daysPerWeek
update public.programs p
set workouts = cleaned.w,
    "daysPerWeek" = 6,
    weeks = greatest(1, coalesce((select max((x->>'week')::int) from jsonb_array_elements(cleaned.w) x), 1))
from (
  select id,
    (select jsonb_agg(w order by (w->>'week')::int, (w->>'day')::int)
       from jsonb_array_elements(workouts) w
      where (w->>'day')::int <= 6) as w
  from public.programs
  where type = 'GroupPT' and workouts is not null
    and (select max((x->>'day')::int) from jsonb_array_elements(workouts) x) > 6
) cleaned
where p.id = cleaned.id;

-- STEP 3 (verify)
select name, weeks, "daysPerWeek",
       (select max((w->>'day')::int) from jsonb_array_elements(workouts) w) as max_day
from public.programs where type = 'GroupPT' order by name;

notify pgrst, 'reload schema';
