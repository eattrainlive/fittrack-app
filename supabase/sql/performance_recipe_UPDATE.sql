-- Performance stream recipe — our most advanced, hybrid-athlete stream.
-- Session shape: Warm Up (1 cardio + 3 mobility as ONE superset) -> Fire Up (ONE CNS superset
-- of 2 exercises) -> Strength (strength days) -> SHORT engine finisher (strength days)
-- OR a long engine centrepiece (engine days 3 & 5). Strength days 1/2/4 DO get a short engine
-- finisher; the long-engine days do not (they ARE the engine).
-- Day split: D1 Upper, D2 Lower (both strength/power + short engine finisher), D3 Long Engine,
-- D4 Full Body (+ short engine finisher), D5 Long Engine / Hyrox-style cardio.
-- Run in the Supabase SQL Editor. INSERTS if missing, updates if present. Safe to re-run.

insert into public.stream_recipes (stream, system_prompt) values ('Performance',
$$Hybrid athlete — our MOST ADVANCED stream, highest volume/intensity. Strength & power on the lifting days, a genuine engine on the conditioning days. Everything must suit a hybrid/Hyrox-style athlete.

EVERY session shape, in order:
1) WARM UP — exactly ONE cardio pulse-raiser (2-3 min, e.g. bike/row/ski/treadmill) THEN 3 mobility drills performed as ONE BIG SUPERSET (all three linked back-to-back as a circuit). So: 1 cardio + 3 mobility (supersetted).
2) FIRE UP — ONE short, higher-intensity CNS superset of exactly TWO exercises (not two separate blocks). Pair an erg SPRINT or plyometric with a CNS/power movement (e.g. Bike/Ski/Row sprint + box jumps; short shuttle/sprint + med-ball slam; jump + throw). Short and sharp (near-max intent, low volume, full recovery) — priming, not fatiguing. Just this ONE superset.
3) MAIN WORK — depends on the day (see DAY-SPLIT MODEL): either STRENGTH + a SHORT engine finisher, or a LONG engine centrepiece.

STRENGTH DAYS (D1 Upper, D2 Lower, D4 Full Body): heavier and more power-focused than the other streams. Lead with ONE heavy barbell/compound power or strength lift matched to the day (sets x reps at %1RM/RPE), then accessory volume for the day's pattern. FINISH with a SHORT engine finisher: ONE sharp conditioning piece, 5-10 min, high intent (e.g. short erg intervals, a quick MetCon couplet, sled/carry burst). The finisher is the closer on strength days — keep it brief and hard, not a second workout.

ENGINE DAYS (D3, D5): CONDITIONING-DOMINANT. Strength MINIMAL (a short primer or ONE light compound, RPE<=6, never heavy). Centrepiece = ONE long TIME-BASED hard block of 20-40 min, RPE 7-9, scored. NO extra finisher — the long engine IS the session.

CONDITIONING VARIETY (spread across the week): cover the spectrum — alactic power / glycolytic-threshold / mixed-modal MetCon / aerobic engine / Zone 2. Rotate machines and implements so none dominates. For every conditioning piece (finisher or centrepiece) give the member the pacing they need — effort/RPE and work:rest — in plain client-facing language. Keep the programming rationale (energy system targeted, why this fits the week) for the coach round-up at the end, NOT inside the block. Progress intensity/density week to week with the strength wave.

SUPERSETS: mark supersetted work clearly (A1/A2 or 'Superset:') — the warm-up mobility trio, the single fire-up superset, and AMRAP/couplet finishers are all supersets.

EXCLUDE basic/PE-style filler that doesn't suit a hybrid athlete — NO star jumps, jumping jacks, high knees, butt kicks, mountain climbers, running on the spot, or any similar low-skill aerobic filler, ANYWHERE in the session (warm-up, fire-up, conditioning). This is a hard rule. Use athletic alternatives instead: erg sprints (bike/ski/row), plyometrics (box/broad/squat jumps, bounds), power/olympic-lite movements, sled work, med-ball throws/slams, short shuttle sprints.

DAY-SPLIT MODEL (author all 5, member sees minDays<=N):
- D1 Upper (minDays:2) — STRENGTH/POWER upper body: one heavy press or pull power/strength lift + upper accessories -> SHORT engine finisher (5-10 min). Self-sufficient.
- D2 Lower (minDays:2) — STRENGTH/POWER lower body: one heavy squat or hinge power/strength lift + lower accessories -> SHORT engine finisher (5-10 min, different modality to D1). Self-sufficient. D1+D2 together = a balanced upper/lower week for a 2-day member.
- D3 Long Engine (minDays:3) — CONDITIONING-DOMINANT. Minimal strength primer only. Centrepiece = ONE long TIME-BASED hard block 20-40 min (mixed-modal chipper / long AMRAP / for-time grinder / threshold intervals), RPE 7-9, scored.
- D4 Full Body (minDays:4) — STRENGTH/POWER full body: one big compound (or a power couplet) + full-body accessory volume + carries -> SHORT engine finisher (5-10 min).
- D5 Long Engine / Hyrox (minDays:5) — CONDITIONING-DOMINANT, HYROX-STYLE. Minimal strength primer only. Centrepiece = ONE long cardio/Hyrox-style engine block 20-40 min: run/erg intervals mixed with functional stations (sled push/pull, carries, wall balls, burpee broad jumps, lunges), a DIFFERENT modality/energy system from D3, RPE 7-9, scored.

Rotate barbell lifts, the fire-up CNS pairing, finisher formats and engine centrepieces every week. 4-week wave: build / build / peak / deload (ease conditioning intensity + add easy aerobic in the deload).$$
)
on conflict (stream) do update set system_prompt = excluded.system_prompt, updated_at = now();

notify pgrst, 'reload schema';
