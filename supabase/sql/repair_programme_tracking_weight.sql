-- One-off repair: restore "Weight & Reps" on loaded exercises in EXISTING saved programmes that
-- were downgraded to "Reps Only" by the old syncTrackingWithValues bug (weight=0 in a prescription
-- was mis-read as "no weight"). Only touches non-section exercises currently tagged reps-only whose
-- LIBRARY entry is weight-based (by its trackingType tag, or a resistance movement_pattern).
-- Genuine Time / Distance / Calorie tracking is left untouched. Run in the Supabase SQL Editor.
-- Safe to re-run. Pair with the builder fix (builder_fix_syncTracking_weight_BRIEF.md) so new saves
-- don't re-break.

-- ── STEP 1 (preview) — how many exercises would be repaired, by programme ───────────────────
with ex as (
  select p.id, p.name,
         jsonb_array_elements(jsonb_array_elements(p.workouts)->'exercises') as e
  from public.programs p
  where p.workouts is not null
)
select ex.name as programme, count(*) as will_fix
from ex
join public.exercises lib on lib.id::text = ex.e->>'name'
where coalesce((ex.e->>'isSection')::boolean, false) = false
  and coalesce((ex.e->>'reference')::boolean, false) = false
  and lower(coalesce(ex.e->>'trackingType','')) like '%reps only%'
  and lower(coalesce(ex.e->>'trackingType','')) not like '%weight%'
  and (
    lower(coalesce(lib."trackingType"::text,'')) like '%weight%'
    or lower(coalesce(lib.movement_pattern,'')) ~ 'squat|hinge|lunge|push|press|pull|row|carry|curl|extension|raise|thrust|clean|snatch|deadlift'
  )
group by ex.name
order by will_fix desc;

-- ── STEP 2 (repair) — run once the preview looks right ──────────────────────────────────────
do $$
declare
  p record;
  w jsonb;
  ex jsonb;
  new_workouts jsonb;
  new_exs jsonb;
  lib_track text;
  lib_pattern text;
  tt text;
  is_loaded boolean;
begin
  for p in select id, workouts from public.programs where workouts is not null loop
    new_workouts := '[]'::jsonb;
    for w in select value from jsonb_array_elements(p.workouts) loop
      new_exs := '[]'::jsonb;
      for ex in select value from jsonb_array_elements(coalesce(w->'exercises', '[]'::jsonb)) loop
        tt := lower(coalesce(ex->>'trackingType',''));
        if coalesce((ex->>'isSection')::boolean, false) = false
           and coalesce((ex->>'reference')::boolean, false) = false
           and tt like '%reps only%'
           and tt not like '%weight%'
        then
          select lower(coalesce(e."trackingType"::text,'')), lower(coalesce(e.movement_pattern,''))
            into lib_track, lib_pattern
            from public.exercises e where e.id::text = ex->>'name' limit 1;

          is_loaded := (coalesce(lib_track,'') like '%weight%')
                    or (coalesce(lib_pattern,'') ~ 'squat|hinge|lunge|push|press|pull|row|carry|curl|extension|raise|thrust|clean|snatch|deadlift');

          if is_loaded then
            ex := jsonb_set(ex, '{trackingType}', '["Weight & Reps"]'::jsonb, true);
            ex := jsonb_set(ex, '{blockType}', '"Strength"'::jsonb, true);
          end if;
        end if;
        new_exs := new_exs || ex;
      end loop;
      new_workouts := new_workouts || jsonb_set(w, '{exercises}', new_exs, true);
    end loop;
    update public.programs set workouts = new_workouts where id = p.id;
  end loop;
end $$;

-- ── STEP 3 (verify) — should return 0 rows after the repair ─────────────────────────────────
with ex as (
  select p.name,
         jsonb_array_elements(jsonb_array_elements(p.workouts)->'exercises') as e
  from public.programs p
  where p.workouts is not null
)
select ex.name as programme, ex.e->>'name' as exercise_id, ex.e->>'trackingType' as tracking
from ex
join public.exercises lib on lib.id::text = ex.e->>'name'
where coalesce((ex.e->>'isSection')::boolean, false) = false
  and lower(coalesce(ex.e->>'trackingType','')) like '%reps only%'
  and lower(coalesce(ex.e->>'trackingType','')) not like '%weight%'
  and (
    lower(coalesce(lib."trackingType"::text,'')) like '%weight%'
    or lower(coalesce(lib.movement_pattern,'')) ~ 'squat|hinge|lunge|push|press|pull|row|carry|curl|extension|raise|thrust|clean|snatch|deadlift'
  );

notify pgrst, 'reload schema';
