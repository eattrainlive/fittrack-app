-- Restore the "Workouts (TV Display)" card on programmes that save with NULL weeks/daysPerWeek
-- (the card only renders when BOTH p.weeks and p."daysPerWeek" are set). Derives both from the
-- workouts jsonb: weeks = highest week number present; daysPerWeek = most sessions in any one week.
-- Run in the Supabase SQL Editor. Safe to re-run — only fills NULLs, never overwrites real values.

-- STEP 1 — weeks (highest week number in the workouts array, min 1)
update public.programs
set weeks = greatest(1, coalesce(
  (select max( nullif(regexp_replace(w->>'week', '\D', '', 'g'), '')::int )
     from jsonb_array_elements(workouts) w), 1))
where weeks is null
  and workouts is not null
  and jsonb_typeof(workouts) = 'array';

-- STEP 2 — daysPerWeek (the largest number of sessions in any single week, min 1)
update public.programs
set "daysPerWeek" = greatest(1, coalesce(
  (select max(cnt) from (
     select count(*) as cnt
       from jsonb_array_elements(workouts) w
      group by w->>'week'
   ) t), 1))
where "daysPerWeek" is null
  and workouts is not null
  and jsonb_typeof(workouts) = 'array';

-- verify — every programme should now have weeks + daysPerWeek
select id, name, weeks, "daysPerWeek",
       coalesce(jsonb_array_length(workouts), 0) as workout_count
from public.programs
where is_deleted is not true
order by name;

notify pgrst, 'reload schema';
