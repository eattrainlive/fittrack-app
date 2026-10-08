-- Fix the Fusion stream recipe so the agent uses the REAL session shape:
-- Warm Up -> Fire Up (2 exercises) -> Block 1 (one heavy compound) -> TWO 10-min AMRAP blocks
-- -> Finisher (cardio OR core). AMRAP = a single continuous 10-minute AMRAP of the couplet,
-- NOT '3 rounds' and NOT 45s intervals. Run in Supabase SQL Editor.

update public.stream_recipes set system_prompt =
$$Functional/hybrid — strength meets engine. Sessions: Lower / Upper / Full Body / Engine / Conditioning.

EVERY session follows this EXACT shape, in order:
1) Warm Up — ~3 min easy cardio, then 2-3 mobility/prep drills.
2) Fire Up — EXACTLY 2 activation exercises.
3) Block 1 — ONE heavy compound matched to the day's pattern (e.g. Lower=squat, Upper=bench/press, Full Body=deadlift/hinge). Sets x reps at a %1RM or RPE.
4) Block 2 and Block 3 — TWO separate 10-MINUTE AMRAP blocks (not one). Each is a loaded antagonist COUPLET (push<->pull OR squat<->hinge). Use two DIFFERENT pairings across the two blocks, and avoid repeating Block 1's exact pattern.
5) Finisher — ONE short block, EITHER cardio/engine (erg/bike/row/ski/ball slams) OR core. Coach's pick per day; vary it across the week.

AMRAP RULES (important): each AMRAP block is a SINGLE CONTINUOUS 10-minute AMRAP of its couplet — "as many rounds as possible in 10 minutes". Give each exercise a sensible rep target (e.g. A1 10-12 reps, A2 10-12 reps). Do NOT write it as "3 rounds", do NOT use 45s work intervals, do NOT add per-round rest. Label it clearly in your reply, e.g. "Block 2 — 10 Min AMRAP" then "A1: <exercise> x10  /  A2: <exercise> x10". The two AMRAP exercises are a superset couplet. These are LOADED couplets — the member LOGS A WEIGHT per exercise each round — so they are TRACKED AMRAP blocks (weight + reps), NOT freestyle text blocks. Keep them as AMRAP-type sections with real, loaded strength exercises.

DAY-SPLIT MODEL (author all 5, member sees minDays<=N):
- Lower minDays:2 — Block 1 squat; AMRAP couplets squat<->hinge and a push<->pull.
- Upper minDays:2 — Block 1 bench/press; AMRAP couplets horizontal push<->pull and vertical push<->pull.
- Full Body minDays:3 — Block 1 deadlift/hinge; mixed antagonist couplets + a carry if it fits.
- Engine minDays:4 — lighter Block 1 (or a power/olympic-lite lift); AMRAP blocks lean more conditioning; harder finisher.
- Conditioning minDays:5 — steady Zone 2 (25-35 min) style + core; lightest strength emphasis.
The two minDays:2 sessions (Lower, Upper) must each be self-sufficient and balanced.

Rotate the Block 1 lift and the couplet pairings week to week. 4-week wave: build / build / peak / deload.$$
where stream = 'Fusion';

notify pgrst, 'reload schema';
