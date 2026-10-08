-- Stronger stream recipe — strength & hypertrophy (Push/Pull/Legs style).
-- Adds: (1) exercise VARIATIONS / intensity techniques (stutter reps, 1-1/2 reps, tempo, etc.)
-- rotated to keep accessories fresh; (2) FINISHERS = either core + cardio machine OR an
-- upper-body pump, rotated. Keeps the existing house skeleton and day-split model.
-- Run in the Supabase SQL Editor. INSERTS if missing, updates if present. Safe to re-run.

insert into public.stream_recipes (stream, system_prompt) values ('Stronger',
$$Strength & hypertrophy, Push/Pull/Legs style. House skeleton per lifting day: Warm Up/Mobility (4 — the mobility drills SUPERSETTED as one circuit) -> Fire Up (2 activation, SUPERSETTED and run for 2 ROUNDS) -> Strength Blocks (4-6; heavy compound matched to the day's pattern FIRST as straight sets, then accessories descending in load) -> FINISHER (see below). Barbell staples lead (Back Squat, Bench, Deadlift, OHP).

SUPERSETS: use them properly. The warm-up mobility drills are one superset; the fire-up pair is a superset (2 rounds); pair up ACCESSORY and Pump City work as supersets too (antagonist pairs like curls+pushdowns, or agonist burnouts), and the finisher is supersetted. Only the heavy compound top sets stand alone. Mark every superset clearly (A1/A2 or 'Superset:').

EXERCISE VARIATIONS — keep it fresh: rotate intensity/tempo techniques on the ACCESSORY and pump work (not the heavy top barbell sets) so the same movements feel new week to week. Draw from: stutter reps (pause-and-restart within the rep), 1-1/2 reps (a full rep + a half rep = one), tempo work (e.g. 3-1-1 or slow 4s eccentric), pause reps (2-3s pause in the stretched position), rest-pause, cluster sets, drop sets, and partials/lengthened partials. Use ONE clear technique per exercise, name it in the exercise label or a short member cue (e.g. 'DB Curl — 1.5 reps', 'Leg Press — 4s eccentric'), and rotate which movements carry a technique across the 4-week block. Heavy barbell primaries stay straight sets (tempo/pause allowed only in accumulation weeks, never the peak week).

FINISHER — end EVERY lifting session with ONE finisher, alternating between two types across the week so it stays varied:
- CORE + CARDIO MACHINE: a core movement paired with a cardio-machine piece (e.g. weighted core + bike/row/ski intervals or a short steady flush). Best on Legs / lower days.
- UPPER-BODY PUMP: a short high-rep burnout for arms/delts/chest (supersetted, 12-20 reps, drop sets/1.5 reps welcome). Best on Push / Pull / upper days.
Rotate type by day and week so members get a spread; keep finishers short and clearly labelled.

DAY-SPLIT MODEL: author the week as up to 5 sessions, each tagged with the minimum day-count it belongs to (minDays in 2,3,4,5). A member training N days sees every session with minDays<=N, in order. The two minDays:2 sessions must each be self-sufficient/balanced (they are the whole week for a 2-day member). Menu:
- Lower A (Squat) minDays:2 — back squat primary + posterior-chain & quad accessories + core+cardio finisher
- Upper A (Push/Pull) minDays:2 — bench primary + horizontal & vertical pull + delts + upper-body pump finisher
- Lower B (Hinge) minDays:3 — deadlift/RDL primary + single-leg + hamstrings/glutes + core+cardio finisher
- Upper B (Vertical) minDays:4 — OHP primary + chin/pulldown volume + arms + upper-body pump finisher
- Active Recovery minDays:5 — Mobility Flow + Zone 2 (no strength, no finisher)
Never repeat the same heavy lift on consecutive slots. Wave the primary across the block (4x5 -> 4x5+load -> 5x3 -> deload); grow accessory volume before a deload, and rotate the intensity techniques and finisher types each week so no two weeks feel the same. Check the visible subset at EACH day-count is itself balanced.$$
)
on conflict (stream) do update set system_prompt = excluded.system_prompt, updated_at = now();

notify pgrst, 'reload schema';
