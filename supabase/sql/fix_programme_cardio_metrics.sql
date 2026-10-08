-- ============================================================================
-- One-time fix for EXISTING programmes: cardio durations stuck in the `reps`
-- field (e.g. "3 min", "18 min", "250m", "30 cals", "30s") get moved into the
-- proper timeMins / timeSecs / distance / calories field, reps cleared, and the
-- stale baked `trackingType` removed so display defers to the exercise library.
--
-- Assumes the `programs` table has a jsonb column `workouts` (array of workouts,
-- each with an `exercises` array). Run in the Supabase SQL Editor.
--
-- STEP 0 (RECOMMENDED) — inspect one programme first to confirm the shape:
--   select id, jsonb_typeof(workouts) as wtype,
--          (workouts -> 0 -> 'exercises' -> 0) as first_exercise
--   from public.programs
--   where workouts is not null limit 3;
-- Confirm `wtype` = 'array' and the exercise has keys like blockType/name/reps.
-- Only run the block below once that looks right.
-- ============================================================================

do $$
declare
  prog        record;
  wk          jsonb;
  ex          jsonb;
  new_wk_arr  jsonb;
  new_ex_arr  jsonb;
  rtxt        text;
  n           int;
begin
  for prog in
    select id, workouts from public.programs
    where workouts is not null and jsonb_typeof(workouts) = 'array'
  loop
    new_wk_arr := '[]'::jsonb;

    for wk in select value from jsonb_array_elements(prog.workouts) as t(value) loop
      new_ex_arr := '[]'::jsonb;

      for ex in select value from jsonb_array_elements(coalesce(wk->'exercises','[]'::jsonb)) as t(value) loop
        rtxt := lower(trim(coalesce(ex->>'reps','')));
        n := nullif((regexp_match(rtxt, '^([0-9]+)'))[1], '')::int;

        if n is not null then
          if rtxt ~ '^[0-9]+\s*min' then
            ex := jsonb_set(ex, '{timeMins}', to_jsonb(n));
            ex := jsonb_set(ex, '{reps}', to_jsonb(0));
          elsif rtxt ~ '^[0-9]+\s*cal' then
            ex := jsonb_set(ex, '{calories}', to_jsonb(n));
            ex := jsonb_set(ex, '{reps}', to_jsonb(0));
          elsif rtxt ~ '^[0-9]+\s*s' then           -- s / sec / secs / seconds
            ex := jsonb_set(ex, '{timeSecs}', to_jsonb(n));
            ex := jsonb_set(ex, '{reps}', to_jsonb(0));
          elsif rtxt ~ '^[0-9]+\s*m' then           -- m / metre / metres  (min handled above)
            ex := jsonb_set(ex, '{distance}', to_jsonb(n));
            ex := jsonb_set(ex, '{reps}', to_jsonb(0));
          end if;
        end if;

        -- drop stale baked trackingType so the live library drives the metric
        ex := ex - 'trackingType';

        new_ex_arr := new_ex_arr || ex;
      end loop;

      wk := jsonb_set(wk, '{exercises}', new_ex_arr);
      new_wk_arr := new_wk_arr || wk;
    end loop;

    update public.programs set workouts = new_wk_arr where id = prog.id;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Same fix for any programmes whose details were stashed in user_settings via
-- the app's save-fallback (key like 'prog_extras_%', value is a JSON string).
-- ----------------------------------------------------------------------------
do $$
declare
  s           record;
  data        jsonb;
  wk          jsonb;
  ex          jsonb;
  new_wk_arr  jsonb;
  new_ex_arr  jsonb;
  rtxt        text;
  n           int;
begin
  for s in
    select user_id, key, value from public.user_settings
    where key like 'prog_extras_%' and value is not null
  loop
    begin
      data := s.value::jsonb;
    exception when others then
      continue;  -- not valid JSON, skip
    end;

    if data ? 'workouts' and jsonb_typeof(data->'workouts') = 'array' then
      new_wk_arr := '[]'::jsonb;
      for wk in select value from jsonb_array_elements(data->'workouts') as t(value) loop
        new_ex_arr := '[]'::jsonb;
        for ex in select value from jsonb_array_elements(coalesce(wk->'exercises','[]'::jsonb)) as t(value) loop
          rtxt := lower(trim(coalesce(ex->>'reps','')));
          n := nullif((regexp_match(rtxt, '^([0-9]+)'))[1], '')::int;
          if n is not null then
            if    rtxt ~ '^[0-9]+\s*min' then ex := jsonb_set(jsonb_set(ex,'{timeMins}',to_jsonb(n)),'{reps}',to_jsonb(0));
            elsif rtxt ~ '^[0-9]+\s*cal' then ex := jsonb_set(jsonb_set(ex,'{calories}',to_jsonb(n)),'{reps}',to_jsonb(0));
            elsif rtxt ~ '^[0-9]+\s*s'   then ex := jsonb_set(jsonb_set(ex,'{timeSecs}',to_jsonb(n)),'{reps}',to_jsonb(0));
            elsif rtxt ~ '^[0-9]+\s*m'   then ex := jsonb_set(jsonb_set(ex,'{distance}',to_jsonb(n)),'{reps}',to_jsonb(0));
            end if;
          end if;
          ex := ex - 'trackingType';
          new_ex_arr := new_ex_arr || ex;
        end loop;
        wk := jsonb_set(wk, '{exercises}', new_ex_arr);
        new_wk_arr := new_wk_arr || wk;
      end loop;
      data := jsonb_set(data, '{workouts}', new_wk_arr);
      update public.user_settings set value = data::text where user_id = s.user_id and key = s.key;
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
