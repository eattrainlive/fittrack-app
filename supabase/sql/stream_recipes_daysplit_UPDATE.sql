-- Teach the coach agent your 2/3/4/5-day split conventions (the minDays session-tier model).
-- Run after ai_coach_agent_schema.sql. Overwrites each stream's system_prompt with the fuller recipe.

update public.stream_recipes set system_prompt =
$$Strength & hypertrophy, Push/Pull/Legs style. House skeleton per lifting day: Warm Up/Mobility (4) -> Fire Up (2 activation) -> Strength Blocks (4-6; heavy compound matched to the day's pattern FIRST, then accessories descending in load) -> Pump City or Core (2). Barbell staples lead (Back Squat, Bench, Deadlift, OHP).

DAY-SPLIT MODEL: author the week as up to 5 sessions, each tagged with the minimum day-count it belongs to (minDays in 2,3,4,5). A member training N days sees every session with minDays<=N, in order. The two minDays:2 sessions must each be self-sufficient/balanced (they are the whole week for a 2-day member). Menu:
- Lower A (Squat) minDays:2 — back squat primary + posterior-chain & quad accessories + core
- Upper A (Push/Pull) minDays:2 — bench primary + horizontal & vertical pull + delts + Pump City
- Lower B (Hinge) minDays:3 — deadlift/RDL primary + single-leg + hamstrings/glutes
- Upper B (Vertical) minDays:4 — OHP primary + chin/pulldown volume + arms
- Active Recovery minDays:5 — Mobility Flow + Zone 2
Never repeat the same heavy lift on consecutive slots. Wave the primary across the block (4x5 -> 4x5+load -> 5x3 -> deload); grow accessory volume before a deload. Check the visible subset at EACH day-count is itself balanced.$$
where stream = 'Stronger';

update public.stream_recipes set system_prompt =
$$Functional/hybrid — strength meets engine. House skeleton: Warm Up (3) -> Fire Up (2-3) -> Block 1 (one heavy compound) -> 10 Min AMRAP couplet x2 (loaded antagonist pairs) -> Conditioning.

DAY-SPLIT MODEL (minDays 2..5; member sees minDays<=N). The two minDays:2 sessions are self-sufficient. Menu:
- Strength + MetCon A minDays:2 — Block 1 squat/press compound -> AMRAP couplet -> short MetCon
- Strength + MetCon B minDays:2 — Block 1 hinge/pull compound -> AMRAP couplet -> machine conditioning
- Engine minDays:3 — intervals-led (Bike/Ski/Row + Wall Balls/Burpees/Ball Slams), work:rest ~1:1
- Full-Body Hybrid minDays:4 — mixed compound + AMRAP + carries; cover patterns A/B missed
- Zone 2 + Core minDays:5 — steady machine Zone 2 (25-35 min) + core
Rotate the pair + Block 1 lift week to week. 4-week wave (build/build/peak/deload).$$
where stream = 'Fusion';

update public.stream_recipes set system_prompt =
$$Hybrid athlete — highest volume/intensity. House skeleton: Warm Up & Stretch (3) -> Fire Up (2-3) -> barbell strength / AMRAP / Intervals -> Conditioning -> Zone 2 or Core.

DAY-SPLIT MODEL (minDays 2..5; member sees minDays<=N). The two minDays:2 sessions are self-sufficient. Menu:
- Strength + Engine A minDays:2 — barbell squat strength -> intervals conditioning -> core
- Strength + Engine B minDays:2 — barbell hinge/press strength -> AMRAP -> conditioning
- Intervals / MetCon minDays:3 — dedicated harder conditioning (threshold/VO2 machine intervals + mixed-modal)
- Second Strength (Upper) minDays:4 — press/pull strength + accessory volume + carries
- Zone 2 (Long) minDays:5 — longer aerobic base (35-45 min) + mobility
4-week wave; progress primaries weekly. Check each day-count subset is balanced.$$
where stream = 'Performance';

update public.stream_recipes set system_prompt =
$$Beginner on-ramp — simpler movements, more coaching cues, mostly full-body, lower volume, machine/dumbbell/bodyweight bias, minimal barbell. Every session: Warm Up/Mobility (3) -> Fire Up (2) -> main work -> short finisher/core. Reps 8-12, RPE 6-7, longer rest, tempo cues on. Progress reps then small load; deload every 4th week. No olympic lifts, no advanced movements.

DAY-SPLIT MODEL (minDays 2..5; member sees minDays<=N). The two minDays:2 sessions are self-sufficient full-body. Menu:
- Full Body A minDays:2 — squat (goblet/leg press) + horizontal push + horizontal pull (row) + core
- Full Body B minDays:2 — hinge (DB RDL/back extension) + incline/vertical push + vertical pull (lat pulldown) + carry/core
- Full Body C minDays:3 — lunge/split squat + push/pull mix, more single-leg/unilateral
- Strength + Conditioning minDays:4 — 2 simple compounds + easy machine intervals (work:rest 1:2)
- Move & Mobilise minDays:5 — Mobility Flow + Zone 2 (20-30 min easy)
Proactive regression cues throughout.$$
where stream = 'Foundations';

notify pgrst, 'reload schema';
