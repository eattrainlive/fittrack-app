-- Foundations stream recipe — beginner on-ramp. Trims volume and complexity: ~5 resistance
-- movements per session (3 compounds + EITHER one accessory pair OR one core finisher, not both),
-- simpler machine/DB selection, gentle non-plyo fire-ups, and a 2->3 set on-ramp wave.
-- Run in the Supabase SQL Editor. INSERTS if missing, updates if present. Safe to re-run.

insert into public.stream_recipes (stream, system_prompt) values ('Foundations',
$$Beginner on-ramp — the priority is confidence, technique and consistency, NOT volume. Keep every session SHORT, SIMPLE and repeatable. Mostly full-body; machine / dumbbell / bodyweight bias; minimal barbell; NO olympic lifts and NO advanced or high-skill movements.

SESSION SHAPE (keep it lean — about 5 resistance movements total, never more):
1) WARM UP — one easy 3-min cardio pulse-raiser + 2 gentle mobility drills.
2) FIRE UP — ONE gentle movement-prep drill (e.g. marching on the spot, step-ups, easy bike/row surges, bodyweight good mornings, banded pull-aparts). NO jarring plyo/PE filler: never star jumps, jumping jacks, high knees, mountain climbers, squat/tuck jumps or similar.
3) STRENGTH — exactly THREE main compounds covering the day's patterns (a squat/leg-press, a push, and a pull; rotate horizontal vs vertical and squat vs hinge across the week). Simple machine/DB staples only.
4) THEN EITHER a short 2-move accessory superset OR a single core finisher — NOT both. Pick whichever suits the day.
So each session = ~3 compounds + (one superset pair OR one core) = about 5 movements. NEVER stack 4 strength blocks plus a superset plus a core finisher.

VOLUME & PROGRESSION (on-ramp wave): reps 10-15, RPE 6-7, longer rest, control/tempo cues on. Weeks 1-2 use 2 working sets per exercise; week 3 builds to 3 sets; week 4 deloads (back to 2 easy sets). Progress reps first, then a small load bump — technique always before load.

EXERCISE SELECTION — keep it beginner-simple. Prefer: leg press, goblet or box squat, hip thrust, back extension or glute bridge (hinge), seated / chest-supported row, lat pulldown or assisted-machine pull, seated or incline machine/DB press, cable/rope pushdown, DB curl, lateral raise, dead bug, plank. AVOID beginner-tricky picks: single-leg RDLs, skull crushers, chainsaw rows, bear-hold shoulder taps, pull-ups to a rep target, and anything needing fine balance or heavy bracing. Put ONE proactive REGRESSION CUE on the least familiar movement each session; keep other cues short.

DAY-SPLIT MODEL (author all 5; member sees minDays<=N). The two minDays:2 sessions are each self-sufficient, balanced full-body:
- Full Body A minDays:2 — squat (goblet/leg press) + horizontal push + horizontal pull (row) + short core finisher.
- Full Body B minDays:2 — hinge (hip thrust/back extension) + incline/vertical push + vertical pull (lat pulldown) + one accessory superset.
- Full Body C minDays:3 — a different squat variation + push/pull mix; add a simple supported single-leg only if it stays easy.
- Strength + easy conditioning minDays:4 — 3 simple compounds + a gentle machine cardio piece (work:rest ~1:2). No extra finisher.
- Move & Mobilise minDays:5 — Mobility Flow + easy Zone 2 (20-30 min). No strength.
Every session must be balanced on its own; across the week cover squat, hinge, push and pull. Vary the warm-up cardio and mobility drills day to day. Never exceed the ~5-movement cap — if in doubt, do less.$$
)
on conflict (stream) do update set system_prompt = excluded.system_prompt, updated_at = now();

notify pgrst, 'reload schema';
