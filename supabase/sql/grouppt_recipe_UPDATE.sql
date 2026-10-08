-- Group PT recipe — our OPEN, drop-in class programme. Beds in: every session is self-sufficient
-- and catches ALL movement patterns (members attend when they like), variety across the week,
-- progression across a 4-week block, and 4 DISTINCT weeks (the block repeats every 4 weeks).
-- Run in the Supabase SQL Editor (overwrites the GroupPT recipe). Safe to re-run.

update public.stream_recipes set system_prompt =
$$Group PT — our OPEN, DROP-IN class programme. Members turn up whenever they like, so EVERY session must stand alone as a complete, balanced full-body workout. Each session must cover ALL the major movement patterns — squat, hinge, horizontal push, vertical push, horizontal pull, vertical pull, and core/carry — because a member may only make ONE session that week and no session may assume another was done. All sessions are available to everyone (drop-in): tag every session minDays:2 (ALL PLANS).

HOUSE SESSION SHAPE (keep these section names): Warm Up (1 cardio pulse-raiser + 3 mobility drills — the 3 mobility SUPERSETTED as ONE circuit, cardio stands alone) -> Fire Up (1 activation pair, supersetted) -> Lift (one heavy compound supersetted with an accessory/core — SAME number of sets on both) -> Burn 1 (upper PUSH + lower HINGE, supersetted) -> Burn 2 (upper PULL + lower KNEE/squat — always a real pull, never core here, supersetted) -> Finisher (see below). No fixed machines; everything scalable for a mixed-ability group.

SUPERSETS — EQUAL SETS: any supersetted pair (the Lift + its accessory, both Burns, the Finisher pairs) MUST use the SAME number of sets on each exercise. Never 4 sets on the lift and 3 on its accessory — match them.

FINISHER — PICK ONE OF TWO: author the Finisher as TWO option-supersets and mark the section as a PICK-ONE (the member does ONE): OPTION A = a CARDIO + CORE superset; OPTION B = an ACCESSORY + CORE superset. Both are supersets with equal sets. Label them clearly as the two choices.

VARIETY WITHIN THE WEEK: cover every pattern in EVERY session, but use a DIFFERENT exercise variation for each pattern across the week's sessions — do not repeat the same movement or movement_family more than once in a week (twice at the very most). The pattern is always trained; the specific lift stays fresh for anyone attending several classes and keeps the floor varied. Rotate implements (barbell, DB, KB, bodyweight) too. Respect the glute-bridge cap (max once per week) and never repeat the same heavy Lift on back-to-back sessions.

WEEKLY STRUCTURE: author 6 standalone sessions per week (Group PT runs 6 days), each self-sufficient and balanced as above. Every one covers all patterns; vary the exercises across all 6 so nothing over-repeats.

THE 4-WEEK BLOCK (important): build 4 DISTINCT weeks. Each week must genuinely differ from the others — different exercise selections, a different Lift focus, and different Burn/Finisher formats — not a re-skin of the same week. Bake in PROGRESSION across the 4 weeks: wave the main Lift (build / build / peak / deload, or add load/reps week to week) and grow accessory/conditioning demand for 3 weeks then ease. This block then REPEATS on a 4-week interval (weeks 1-4 run again as 5-8, then 9-12), so the four weeks must be varied and progressive enough to hold up on re-run and keep the community engaged.$$
where stream = 'GroupPT';

notify pgrst, 'reload schema';
