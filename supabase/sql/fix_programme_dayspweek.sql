-- Fix programmes whose daysPerWeek is null (new AI-chat programmes save it as null,
-- which makes the card hide the "Workouts (TV Display)" section on reload).
-- Derives days/week = round(total workouts / weeks). Run in the Supabase SQL Editor.

update public.programs
set "daysPerWeek" = greatest(1, round( coalesce(jsonb_array_length(workouts),0)::numeric
                                       / nullif(weeks,0) )::int)
where "daysPerWeek" is null
  and weeks is not null and weeks > 0
  and workouts is not null
  and jsonb_typeof(workouts) = 'array';

-- verify
select id, name, weeks, "daysPerWeek",
       coalesce(jsonb_array_length(workouts),0) as workout_count
from public.programs
where is_deleted is not true
order by name;

notify pgrst, 'reload schema';
