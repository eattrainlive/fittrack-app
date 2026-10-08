// Supabase Edge Function: generate-workout  (with prompt caching)
// Deploy:  supabase functions deploy generate-workout   (this is the function the app invokes)
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Optional: supabase secrets set ALLOWED_ORIGIN=https://etlfittrack.netlify.app
//
// PROMPT CACHING: the system prompt + exercise library are sent as a cached block
// (cache_control). The first call in a run pays full price + 25% to write the cache;
// every later call (e.g. each week of a full programme) reads it at ~10% cost.
//
// ── MODEL: menu + dayCounts (per-member training frequency) ───────────────────
// Each stream has a fixed WEEKLY SESSION MENU. The generator authors the WHOLE menu
// for each week and tags every session with:
//   * name       = its theme (e.g. "Push", "Full Body A") -> shown as the session title
//   * dayCounts  = the training frequencies (2-5) that session belongs to
// The member app shows the sessions where  session.dayCounts.includes(preferredDays).
// Cumulative streams (Foundations/Fusion/Performance) tier as subsets; STRONGER uses a
// Push/Pull/Legs base with a SEPARATE 2-day Full-Body pair:
//   2 days -> Full Body A + Full Body B
//   3 days -> Push, Pull, Legs
//   4 days -> + Mobility & Cardio
//   5 days -> + Full Body
//
// FOUNDATIONS is a beginner on-ramp (own low-volume structure + Beginner-only pool +
// deterministic shaping). ALL streams open each session's Warm Up with a 3-min cardio machine.
//
// This is an EDGE-FUNCTION change: it only takes effect once deployed
//   (`supabase functions deploy generate-workout`). App/frontend deploys do nothing here.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 12000;

type MenuEntry = { type: string; dayCounts: number[] };
const STREAM_MENUS: Record<string, MenuEntry[]> = {
  // Beginner on-ramp — cumulative full-body subsets
  Foundations: [
    { type: "Full Body A", dayCounts: [2, 3, 4, 5] },
    { type: "Full Body B", dayCounts: [2, 3, 4, 5] },
    { type: "Full Body C", dayCounts: [3, 4, 5] },
    { type: "Strength + Easy Cardio", dayCounts: [4, 5] },
    { type: "Move & Recover", dayCounts: [5] },
  ],
  // Push / Pull / Legs (+ Mobility & Cardio + Full Body); 2-day = two Full Body sessions
  Stronger: [
    { type: "Full Body A", dayCounts: [2] },
    { type: "Full Body B", dayCounts: [2] },
    { type: "Push", dayCounts: [3, 4, 5] },
    { type: "Pull", dayCounts: [3, 4, 5] },
    { type: "Legs", dayCounts: [3, 4, 5] },
    { type: "Mobility & Cardio", dayCounts: [4, 5] },
    { type: "Full Body", dayCounts: [5] },
  ],
  // Functional / hybrid — cumulative
  Fusion: [
    { type: "Lower Focus", dayCounts: [2, 3, 4, 5] },
    { type: "Upper Focus", dayCounts: [2, 3, 4, 5] },
    { type: "Full Body", dayCounts: [3, 4, 5] },
    { type: "Engine", dayCounts: [4, 5] },
    { type: "Conditioning", dayCounts: [5] },
  ],
  // Hybrid athlete — concurrent strength + hard engine (HYROX/functional flavour)
  Performance: [
    { type: "Lower Strength + Engine", dayCounts: [2, 3, 4, 5] },
    { type: "Upper Strength + Engine", dayCounts: [2, 3, 4, 5] },
    { type: "Engine Intervals", dayCounts: [3, 4, 5] },
    { type: "Full-Body Power MetCon", dayCounts: [4, 5] },
    { type: "Long Engine / Zone 2", dayCounts: [5] },
  ],
};
function menuFor(stream: string): MenuEntry[] {
  return STREAM_MENUS[stream] ?? STREAM_MENUS["Stronger"];
}
function dayTypeFor(stream: string, day: number): string {
  const m = menuFor(stream);
  return m[(day - 1) % m.length].type;
}
function dayCountsFor(stream: string, day: number): number[] {
  const m = menuFor(stream);
  return m[(day - 1) % m.length].dayCounts;
}

const SYSTEM_PROMPT = `You are the head coach's programming assistant for Eat Train Live. Build workouts and programmes in the house style, selecting ONLY from the provided exercise library (reference exercises by their id). Follow these skeletons exactly and use these exact section names.

Streams:
- Foundations (BEGINNER on-ramp, full-body, LOW volume - a complete-beginner programme, NOT a Stronger programme): Warm Up/Mobility (a 3-minute easy cardio machine + 3 mobility/activation drills) -> Main Work (EXACTLY 4 movements covering squat / hinge / push / pull) -> Core & Finish (1-2 simple core/carry moves PLUS a short easy cardio finisher - calories or metres on a machine, e.g. "12-15 cal easy Bike/Row" or "200m Ski", or a general cardio move like 40s march / step-ups / mountain climbers). Main Work is STRAIGHT SETS only: 2-3 sets x 8-15 reps, RPE 6-7, rest 60-90s; put a simple tempo and a short coaching cue in each item's staffNotes. Day types: Full Body A (squat + horizontal push + horizontal pull + core), Full Body B (hinge + vertical/incline push + vertical pull + carry), Full Body C (split squat/step-up + mixed push/pull, more single-leg), Strength + Easy Cardio (2 simple compounds + "Easy Conditioning": gentle machine intervals ~1:2, RPE 6), Move & Recover ("Mobility Flow" 6-8 drills + "Zone 2" easy machine 20-30 min). FOUNDATIONS RULES (hard): ONLY beginner-friendly machine/dumbbell/cable/band/bodyweight movements; NEVER barbell back/front squat, deadlift, bench press, overhead/push press, Olympic lifts, Nordic curls, GHD, pull-ups/chin-ups, pistols, renegade rows, get-ups, box jumps, sleds; NO supersets, NO AMRAP/EMOM/metcon, NO low-rep strength; MAX 4 Main Work movements; reps 8-15 only. Section names: Warm Up/Mobility, Main Work, Core & Finish, Easy Conditioning, Mobility Flow, Zone 2 — never Strength Blocks/Pump City/Fire Up/Block 1/10 Min AMRAP/MetCon.
- Stronger (strength & hypertrophy, PUSH / PULL / LEGS split): every strength session = Warm Up/Mobility (3-min easy cardio + 3 mobility) -> Fire Up (2 activation) -> Strength Blocks (4-5; EXACTLY 4 on Push) -> Pump City (all-round arms & shoulders pump, 2-3 moves x3 sets) or Core (2). CRITICAL - the MAIN compound (first Strength Blocks exercise) MUST match the day's pattern (use the exercise movementType tags to choose it):
  * PUSH day (chest/shoulders/triceps) - main compound MUST be an UPPER-BODY PRESS (movementType Push): Bench Press, DB Bench Press, Incline Bench/DB Press, Strict/Overhead Press or Push Press (4x5-8, build to working weight) -> a second press (incline/DB) 3x8-10 -> an OVERHEAD/SHOULDER press (Seated/Strict/Arnold/DB shoulder press, movementType "Vertical Push") 3x8-10 -> shoulders (lateral raise) 3x12-15 -> then a Pump City block (all-round arms & shoulders - see the PUMP CITY rule below). Push day Strength Blocks MUST contain EXACTLY 4 exercises and MUST include a Vertical Push overhead press (not just lateral raises). NEVER a squat or deadlift on Push day.
  * PULL day (back/rear delts/biceps) - main compound MUST be a DEADLIFT VARIATION or HEAVY PULL (movementType Hip or Pull): Deadlift (conventional/sumo/trap-bar), heavy Barbell/Pendlay Row, or Weighted Pull-Up (4x5-8) -> vertical pull (pull-up / lat pulldown) 3x8-10 -> horizontal row 3x10-12 -> rear delt / face pull 3x12-15 -> then a Pump City block (all-round arms & shoulders - see the PUMP CITY rule below).
  * PUMP CITY (on BOTH Push and Pull days - this is an ALL-ROUND ARMS & SHOULDERS pump; do NOT tie it to the day's push/pull theme): choose 2-3 Accessory-tagged ISOLATION moves that TOGETHER hit DIFFERENT muscles across biceps, triceps and shoulders (side/rear delts) - e.g. biceps + triceps, or biceps + triceps + a delt. NEVER two of the same muscle. 3 sets x 12-15, controlled and close to failure; pair antagonists where sensible (a curl with a triceps extension). Vary the choices week to week.
  * LEGS day (quads/hams/glutes/calves) - main compound MUST be a SQUAT VARIATION (movementType Knee): Back Squat, Front Squat, Hack Squat or Leg Press (4x5-8) -> a hinge or single-leg accessory (RDL, Bulgarian split squat, walking lunge) 3x8-10 -> quad/ham/glute accessory 3x10-12 -> calves 2-3x12-15 -> Core x2. (Deadlift belongs on PULL day, not here.)
  * MOBILITY & CARDIO (active recovery): Mobility Flow 6-8 -> Zone 2 20-30 min easy or easy 1:2 intervals - NO strength.
  * FULL BODY (mix: one push compound + one pull compound + one legs compound + one accessory/carry ~3x8-10 -> short Conditioning finisher / Core).
  * FULL BODY A and FULL BODY B (a two-session full-body week - A leans squat + horizontal push/pull, B leans hinge/deadlift + vertical push/pull, so together they cover every pattern).
  Put a TEMPO + coaching cue in staffNotes; rest 2:00-2:30 on mains, ~1:00 on accessories; %1RM or RPE on the main lift and note "build to working weight". Wave the main lift across the block (4x5 -> 4x5+load -> 5x3 -> deload) and creep accessory volume before a deload. Supersets (linkedToNext:true) on antagonist pairs only, never the main heavy lift.
- Fusion (functional/hybrid): Lower Focus / Upper Focus / Full Body / Engine / Conditioning. Warm Up (3, freestyle mobility) -> Fire Up (2-3, tracked activation/plyo) -> Block 1 (ONE heavy compound, %1RM, build to working weight) -> two "10 Min AMRAP" blocks (couplets/triplets, %-based, with a pacing note in the section description) -> Conditioning (short erg finisher). Engine/Conditioning days are pure conditioning: erg warm-up rounds -> EMOM/AMRAP blocks with rest between.
- Performance (HYBRID ATHLETE — concurrent STRENGTH + hard ENGINE, HYROX/functional flavour, athletic & complex movements incl Olympic-lift variations). CRITICAL interference rule: heavy lower-body strength and the hard interval engine are on DIFFERENT sessions; strength-day engine finishers stay moderate (6-10 min), not a full metcon. Sessions:
  * Lower Strength + Engine: Warm Up & Stretch (3-min easy cardio + 2-3 mobility) -> Fire Up (activation + a power primer, e.g. box jumps / pogo hops) -> ONE primary heavy squat OR hinge, %1RM wave, build to working weight (e.g. Back Squat 5x3 @ 85%) + 1-2 posterior/unilateral accessories (walking lunges by metres, RDL) -> Engine finisher: a moderate lower-bias piece (Echo/Air Bike or Row intervals, or sled push/drag), 6-10 min.
  * Upper Strength + Engine: Warm Up & Stretch -> Fire Up -> ONE primary heavy press or pull (Bench / Strict Press wave) + a POWER movement (Push Press or Power Clean-to-Press) + 1-2 accessories (weighted pull-ups, DB press) -> Engine finisher: moderate upper/mixed piece (Ski-Erg + burpees, or Row + push-ups).
  * Engine Intervals (the DEDICATED hard engine day - NO heavy strength here): Warm Up (erg build) -> Fire Up -> hard intervals - threshold/VO2 on run/row/bike (e.g. 5x3 min hard / 2 min easy, or 4x4 min) OR a HYROX-style mixed-modal interval (row + wall balls + burpees). Vary run vs erg week to week. Optional short core/cool-down.
  * Full-Body Power MetCon (complex/athletic movement day): Warm Up -> Fire Up -> ONE barbell power / Olympic-variation piece at moderate load, quality not failure (Power Clean, Hang Clean, Push Press, Thruster, Snatch-grip High Pull; low crisp reps) -> a TOUGH MetCon (EMOM / AMRAP / For Time / Rounds) mixing sled, loaded carries, wall balls, ball slams, box jumps, KB swings, burpees and ski/row/bike calories; rest between blocks; pacing notes.
  * Long Engine / Zone 2: Warm Up -> a longer aerobic block (35-50 min steady run/row/bike, Zone 2, with an RPE/HR cue) OR a HYROX-style grind (e.g. 5 rounds: 1000m row + 20 wall balls + 200m run) -> mobility cool-down.
  Prescribe strength/power lifts with %1RM or RPE, sets x reps, "build to working weight" and a coaching cue; keep Olympic-variation reps low and crisp, never to failure. Write engine blocks with a clear FORMAT (Intervals / EMOM / AMRAP / For Time / Rounds), dual male/female loads & calories (18/12 cal, wall balls 9/6kg) and per-side notation, plus a pacing note. Wave the primary strength lifts across the block; VARY the engine format week to week.

Conditioning/cardio palette (VARY across a block - do NOT reuse one format week to week): (a) short "For Time" erg finisher; (b) EMOM station triplets (sled, carries, ski/row/bike cals, wall balls, burpees, box jumps); (c) AMRAP couplets/triplets with a pacing note; (d) running intervals; (e) Zone 2 steady-state with an RPE/HR cue; (f) erg warm-up rounds with pace cues. Use dual male/female loads/cals (@150kg/100kg, 18/12 cal) and per-side (10/10) notation, with a short coaching note. (Foundations uses ONLY easy machine intervals and Zone 2 - not this hard palette.)

Every session's Warm Up section should begin with a short easy cardio machine piece (about 3 minutes) before the mobility/activation drills.

Exact section names to use: Warm Up/Mobility, Main Work, Core & Finish, Easy Conditioning, Fire Up, Pump City, Strength Blocks, Block 1, Engine, Zone 2, 10 Min AMRAP, MetCon, Mobility Flow, Active Recovery & Mobility, Conditioning, Core.

Selection rules: conditioning is machine-led (Bike Erg, Ski-Erg, Rower, Air Bike, Run, plus Wall Balls, Ball Slams, Burpees, Sled Push, Farmer Carry, Box Jumps). Block 1 / primary lifts are barbell staples (Bench Press, Back Squat, Deadlift) - but NEVER in Foundations. Fire Up = activation. Pump City = all-round arms & shoulders pump (biceps/triceps/delts, 2-3 moves hitting different muscles, 3 sets - NOT tied to the day's push/pull theme). Balance movement patterns within a session; never repeat the same heavy lift on consecutive days. Prescribe sets/reps/tempo/rest for every item. Use only CLEAN rep values - 4, 5, 6, 8, 10, 12, 15 (and 3 for heavy strength triples); never prescribe 7, 9, 11, 13 or 14 reps. For freestyle blocks put the FORMAT in the section description ("3 Rounds", "15 Min EMOM", "AMRAP 12", "For Time") and prescribe reps/calories/distance/load with per-side and dual male/female notation where relevant. Supersets (linkedToNext:true on the first of a pair) are great SPARINGLY on antagonist pairs - never the main heavy lift, NEVER in Foundations. For multi-week programmes wave the primary lift across the block; in Foundations keep it gentle (add reps then a small load, deload every 4th week, reps stay 8-15).`;

const ITEM_SHAPES = `Section item: { "isSection": true, "name": "Fire Up", "sectionType": "Normal", "description": "" }
Exercise item: { "blockType": "Strength", "name": "<exercise id>", "sets": 3, "reps": 10, "weight": 0, "distance": 0, "timeMins": 0, "timeSecs": 0, "rest": 60, "linkedToNext": false, "eachSide": false, "staffNotes": "" }`;

// ── Foundations guards ───────────────────────────────────────────────────────
const FOUND_BAN_NAME = /back squat|front squat|overhead squat|deadlift|romanian deadlift|\brdl\b|bench press|overhead press|push press|strict press|military press|clean|snatch|\bjerk\b|thruster|high pull|nordic|ghd|glute ?ham|pull ?up|chin ?up|muscle ?up|pistol|renegade|turkish|get ?up|box jump|depth jump|broad jump|\bsled\b|prowler|good ?morning|barbell/i;

function beginnerPool(exercises: any[]): any[] {
  const hasDifficulty = exercises.some((e) => e.difficulty);
  let pool = exercises;
  if (hasDifficulty) {
    const beg = exercises.filter((e) => String(e.difficulty || "").toLowerCase() === "beginner");
    if (beg.length >= 20) pool = beg;
  }
  return pool.filter((e) => !FOUND_BAN_NAME.test(String(e.name || "")));
}

const FOUND_BAN_SECTION = /pump city|block 1|10 ?min ?amrap|amrap|metcon|engine|fire ?up/i;
function enforceFoundations(cell: any, cardioSet: Set<string>) {
  const out: any[] = [];
  let sectionKept = true, isMain = false, isCore = false, mainCount = 0, coreCount = 0;
  for (const it of cell.exercises || []) {
    if (it.isSection) {
      let name = String(it.name || "");
      if (FOUND_BAN_SECTION.test(name)) { sectionKept = false; isMain = false; isCore = false; continue; }
      if (/strength/i.test(name)) name = "Main Work";
      isMain = /main work/i.test(name); isCore = /core|finish/i.test(name);
      sectionKept = true; mainCount = 0; coreCount = 0;
      out.push({ ...it, name });
      continue;
    }
    if (!sectionKept) continue;
    if (isMain) {
      if (mainCount >= 4) continue;
      mainCount++;
      let reps = Number(it.reps) || 0;
      if (reps > 0 && reps < 8) reps = 8;
      if (reps > 15) reps = 15;
      out.push({ ...it, reps, linkedToNext: false });
      continue;
    }
    if (isCore) {
      if (!cardioSet.has(String(it.name))) {        // a cardio finisher is always kept + not counted
        if (coreCount >= 2) continue;               // cap core/carry moves at 2
        coreCount++;
      }
    }
    out.push(it);
  }
  cell.exercises = out;
}
// Guarantee a Foundations "Core & Finish" section ends with an easy cardio finisher.
function ensureFoundationsCardioFinish(cell: any, cardioIds: string[], cardioSet: Set<string>, dayIndex: number) {
  if (!cardioIds.length) return;
  const exs = cell.exercises || [];
  const i = exs.findIndex((e: any) => e.isSection && /core|finish/i.test(String(e.name || "")));
  if (i === -1) return; // only sessions that have a Core & Finish section
  let end = i + 1;
  while (end < exs.length && !exs[end].isSection) end++;
  const hasCardio = exs.slice(i + 1, end).some((it: any) => !it.isSection && cardioSet.has(String(it.name)));
  if (hasCardio) return; // model already added a cardio finisher
  const machineId = cardioIds[((dayIndex % cardioIds.length) + cardioIds.length) % cardioIds.length];
  const finisher = {
    blockType: "Cardio", name: machineId, sets: 1, reps: 0, weight: 0, distance: 200,
    timeMins: 0, timeSecs: 0, rest: 0, linkedToNext: false, eachSide: false,
    staffNotes: "Easy cardio finish - ~200m / 12-15 cal, keep it easy", id: Date.now() + Math.random(),
  };
  exs.splice(end, 0, finisher);
  cell.exercises = exs;
}

// ── 3-minute cardio warm-up (all streams, idempotent) ────────────────────────
// PRECISE cardio-machine matches only. Must NOT catch strength moves that merely contain
// "row"/"ski"/"bike"/"run" in their names (Pendlay Row, Ski Abs, Bent Over Row, etc.).
const CARDIO_PATTERNS = [
  /bike[- ]?erg|air[- ]?bike|assault[- ]?bike|echo[- ]?bike/i,
  /ski[- ]?erg/i,
  /\brower\b|row[- ]?erg/i,
  /treadmill|\brun\b/i,
];
// Ordered palette (for day-to-day variety): pick the actual machine by exact/prefix name,
// so we never insert e.g. "BB Pendlay Row" or "Burpee Over Rower" as the warm-up cardio.
const CARDIO_PREF = ["Bike Erg", "Ski Erg", "Rower", "Air Bike", "Treadmill", "Run"];
function cardioMachineIds(exercises: any[]): string[] {
  const ids: string[] = [];
  for (const pref of CARDIO_PREF) {
    const p = pref.toLowerCase();
    const hit =
      exercises.find((e) => String(e.name || "").trim().toLowerCase() === p) ||
      exercises.find((e) => String(e.name || "").trim().toLowerCase().startsWith(p + " ")) ||
      exercises.find((e) => String(e.name || "").trim().toLowerCase().startsWith(p));
    if (hit && !ids.includes(String(hit.id))) ids.push(String(hit.id));
  }
  return ids;
}
// EVERY exercise id that is a cardio machine (so we can strip extras from a warm-up).
function cardioMachineIdSet(exercises: any[]): Set<string> {
  const set = new Set<string>();
  for (const e of exercises) {
    if (CARDIO_PATTERNS.some((re) => re.test(String(e.name || "")))) set.add(String(e.id));
  }
  return set;
}
// movementType tags for an exercise as a string[] (handles array or ";"/"," strings).
function mtOf(e: any): string[] {
  return Array.isArray(e?.movementType)
    ? e.movementType.map((s: any) => String(s).trim())
    : String(e?.movementType || "").split(/[;,]/).map((s: string) => s.trim()).filter(Boolean);
}
// Mobility/activation drills (movementType "Warm Up"), excluding cardio machines - for topping a warm-up up to 3.
function mobilityDrillIds(exercises: any[], cardioSet: Set<string>): string[] {
  const ids: string[] = [];
  for (const e of exercises) {
    if (mtOf(e).includes("Warm Up") && !cardioSet.has(String(e.id))) ids.push(String(e.id));
  }
  return ids;
}

// Warm Up = EXACTLY one 3-min cardio machine (varied by day), then EXACTLY 3 mobility drills.
// Strips any other cardio-machine items the model added; tops up mobility to 3 if short, trims if over.
function ensureCardioWarmup(cell: any, cardioIds: string[], cardioSet: Set<string>, dayIndex: number, mobilityIds: string[] = []) {
  if (!cardioIds.length) return;
  const exs = cell.exercises || [];
  const i = exs.findIndex((e: any) => e.isSection && /warm ?up/i.test(String(e.name || "")));
  if (i === -1) return; // recovery/mobility days have no Warm Up section - skip
  const header = exs[i];
  // End of the warm-up = the next section header AFTER the warm-up header.
  let end = i + 1;
  while (end < exs.length && !exs[end].isSection) end++;
  // Everything before `end` that is NOT a section header is a warm-up item - this deliberately
  // includes any stray items the model emitted BEFORE the Warm Up header (leading orphans),
  // which is how a burpee/cardio can slip in ahead of the inserted machine.
  const warmItems = exs.slice(0, end).filter((it: any) => !it.isSection);
  // Keep only genuine mobility: drop ALL cardio machines AND any "cardio-length" timed piece
  // (>=2 min) - a warm-up drill should be reps or a short hold, not a 3-min row/burpee piece.
  let mobility = warmItems.filter((it: any) =>
    !cardioSet.has(String(it.name)) && (Number(it.timeMins) || 0) < 2
  );
  // Enforce EXACTLY 3 mobility drills.
  if (mobility.length > 3) mobility = mobility.slice(0, 3);
  if (mobility.length < 3 && mobilityIds.length) {
    const used = new Set(mobility.map((m: any) => String(m.name)));
    let mi = Math.abs(dayIndex), guard = 0;
    while (mobility.length < 3 && guard < mobilityIds.length * 2) {
      const id = mobilityIds[(mi++ % mobilityIds.length + mobilityIds.length) % mobilityIds.length];
      guard++;
      if (used.has(id)) continue;
      used.add(id);
      mobility.push({
        blockType: "Mobility", name: id, sets: 2, reps: 8, weight: 0, distance: 0,
        timeMins: 0, timeSecs: 0, rest: 0, linkedToNext: false, eachSide: false,
        staffNotes: "", id: Date.now() + Math.random(),
      });
    }
  }
  const after = exs.slice(end); // the rest of the session (all later sections) is untouched
  const machineId = cardioIds[((dayIndex % cardioIds.length) + cardioIds.length) % cardioIds.length];
  const cardio = {
    blockType: "Cardio", name: machineId, sets: 1, reps: 0, weight: 0, distance: 0,
    timeMins: 3, timeSecs: 0, rest: 0, linkedToNext: false, eachSide: false,
    staffNotes: "3 min easy - build gently", id: Date.now() + Math.random(),
  };
  // Rebuild: Warm Up header FIRST, then exactly one cardio machine, then 3 mobility, then the rest.
  cell.exercises = [header, cardio, ...mobility, ...after];
}

// Stronger PUSH day: guarantee 4 Strength-Block exercises INCLUDING a real overhead press
// (Vertical Push) - not just lateral raises. Idempotent; only touches the Push session.
const OHP_PREF = ["Seated Shoulder Press", "DB Strict Press", "Tempo Shoulder Press", "Arnold Press", "Overhead Press", "Dumbbell Push Press"];
function enforcePushStrength(cell: any, exercises: any[]) {
  if (!/^\s*push\s*$/i.test(String(cell.name || ""))) return;
  const exById = new Map<string, any>(exercises.map((e: any) => [String(e.id), e]));
  const isVPush = (id: string) => { const e = exById.get(String(id)); return !!e && mtOf(e).includes("Vertical Push"); };
  const exs = cell.exercises || [];
  const i = exs.findIndex((e: any) => e.isSection && /strength blocks/i.test(String(e.name || "")));
  if (i === -1) return;
  let end = i + 1;
  while (end < exs.length && !exs[end].isSection) end++;
  const members = exs.slice(i + 1, end);
  const present = new Set(members.map((m: any) => String(m.name)));
  const mkPress = (id: string) => ({
    blockType: "Strength", name: id, sets: 3, reps: 10, weight: 0, distance: 0,
    timeMins: 0, timeSecs: 0, rest: 90, linkedToNext: false, eachSide: false,
    staffNotes: "Overhead press - tempo 2-0-1-0, brace, press to full lockout.", id: Date.now() + Math.random(),
  });
  const inserts: any[] = [];
  // (a) ensure at least one Vertical Push overhead press exists
  if (!members.some((m: any) => isVPush(m.name))) {
    let pressId: string | undefined;
    for (const nm of OHP_PREF) {
      const e = exercises.find((x: any) => String(x.name).toLowerCase() === nm.toLowerCase());
      if (e && !present.has(String(e.id))) { pressId = String(e.id); break; }
    }
    if (!pressId) { const e = exercises.find((x: any) => mtOf(x).includes("Vertical Push") && !present.has(String(x.id))); if (e) pressId = String(e.id); }
    if (pressId) { inserts.push(mkPress(pressId)); present.add(pressId); }
  }
  // (b) top up to 4 total with another distinct Vertical Push if still short
  let count = members.length + inserts.length;
  while (count < 4) {
    const e = exercises.find((x: any) => mtOf(x).includes("Vertical Push") && !present.has(String(x.id)));
    if (!e) break;
    inserts.push(mkPress(String(e.id))); present.add(String(e.id)); count++;
  }
  if (inserts.length) {
    // insert before a lateral-raise accessory if present, else at the end of the section
    const accRel = members.findIndex((m: any) => /lateral raise|side raise/i.test(String(exById.get(String(m.name))?.name || "")));
    const at = accRel === -1 ? end : (i + 1 + accRel);
    exs.splice(at, 0, ...inserts);
    cell.exercises = exs;
  }
}

// Strip conditioning-only movements from any Strength Block / Block 1 (no burpees/ergs as a "lift").
const STRENGTH_TAGS = new Set(["Push", "Horizontal Push", "Vertical Push", "Pull", "Horizontal Pull", "Vertical Pull", "Knee", "Hip", "Core", "Carries", "Accessory"]);
function filterStrengthBlocks(cell: any, exercises: any[]) {
  const exById = new Map<string, any>(exercises.map((e: any) => [String(e.id), e]));
  const eligible = (id: string) => { const e = exById.get(String(id)); return !!e && mtOf(e).some((t) => STRENGTH_TAGS.has(t)); };
  const exs = cell.exercises || [];
  let inStrength = false;
  const out: any[] = [];
  for (const it of exs) {
    if (it.isSection) { inStrength = /strength blocks|block 1/i.test(String(it.name || "")); out.push(it); continue; }
    if (inStrength && !eligible(it.name)) continue; // drop a conditioning-only move from a strength block
    out.push(it);
  }
  cell.exercises = out;
}

// Foundations: write a beginner "easier option" cue into each Main Work item's staffNotes.
function addFoundationsRegressions(cell: any, exercises: any[], enrich: Map<string, any>) {
  const exById = new Map<string, any>(exercises.map((e: any) => [String(e.id), e]));
  const begName = (id: string) => {
    const en = enrich.get(String(id));
    if (!en?.alt_regress) return null;
    const first = String(en.alt_regress).split(/[,/]| or /i)[0].trim();
    const match = exercises.find((x: any) => String(x.name).toLowerCase() === first.toLowerCase());
    // only offer if it's a real beginner move
    return match && String(match.difficulty || "").toLowerCase() === "beginner" ? match.name : null;
  };
  const exs = cell.exercises || [];
  let inMain = false;
  for (const it of exs) {
    if (it.isSection) { inMain = /main work/i.test(String(it.name || "")); continue; }
    if (!inMain || it.isSection) continue;
    const easier = begName(it.name);
    const cue = easier ? `Too tough? Swap to ${easier}, same reps.` : `Too tough? Drop the load or reps.`;
    it.staffNotes = it.staffNotes ? `${it.staffNotes} ${cue}` : cue;
  }
}

// ── Clean rep values ─────────────────────────────────────────────────────────
// Coaches never prescribe 7/9/11/13/14 reps - it looks odd. Snap every working-rep
// value to this ladder. Leave 1-3 (heavy strength singles/doubles/triples) and 0
// (time/distance/calorie items) untouched. 20 kept so high-rep finishers aren't crushed.
const ALLOWED_REPS = [4, 5, 6, 8, 10, 12, 15, 20];
function snapRep(r: number): number {
  if (!Number.isFinite(r) || r <= 3) return r;        // keep 0-3 as-is
  let best = ALLOWED_REPS[0];
  for (const a of ALLOWED_REPS) {
    const d = Math.abs(r - a), bd = Math.abs(r - best);
    if (d < bd || (d === bd && a > best)) best = a;    // nearest; ties round UP (7->8, 9->10, 11->12)
  }
  return best;
}
function snapReps(cell: any) {
  for (const it of cell.exercises || []) {
    if (it.isSection) continue;
    if (typeof it.reps === "number") it.reps = snapRep(it.reps);
  }
}

// ── Enrichment (coaching-intelligence layer) ─────────────────────────────────
// Reads the exercise_enrichment table (seeded separately) so the generator can
// order by CNS/tier and apply contrast/antagonist/finisher pairings. Best-effort:
// if it can't be fetched the generator still works, just without the extra intel.
async function fetchEnrichment(): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return map;
  try {
    const resp = await fetch(`${url}/rest/v1/exercise_enrichment?select=exercise_id,tier,cns,pattern,contrast_pair,finisher_fit,warmup_prep,antagonist_pair,alt_regress`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!resp.ok) return map;
    const rows = await resp.json();
    for (const r of rows) map.set(String(r.exercise_id), r);
  } catch (_e) { /* enrichment is optional */ }
  return map;
}

function buildExerciseList(exercises: any[], enrich?: Map<string, any>): string {
  return exercises.map((ex) => {
    const cat = Array.isArray(ex.category) ? ex.category.join(",") : (ex.category ?? "");
    const mv = Array.isArray(ex.movementType) ? ex.movementType.join(",") : (ex.movementType ?? "");
    let line = `- ${ex.name} | id:${ex.id} | block:${cat} | movement:${mv} | equip:${ex.equipment ?? ""}`;
    const en = enrich?.get(String(ex.id));
    if (en) {
      const bits: string[] = [];
      if (en.tier) bits.push(`tier:${en.tier}`);
      if (en.cns) bits.push(`cns:${en.cns}`);
      if (en.contrast_pair && en.contrast_pair !== "—") bits.push(`contrast:${en.contrast_pair}`);
      if (en.finisher_fit && en.finisher_fit !== "—") bits.push(`finisher:${en.finisher_fit}`);
      if (en.antagonist_pair && en.antagonist_pair !== "—") bits.push(`antagonist:${en.antagonist_pair}`);
      if (en.warmup_prep && en.warmup_prep !== "—") bits.push(`prep:${en.warmup_prep}`);
      if (bits.length) line += ` | ${bits.join(" | ")}`;
    }
    return line;
  }).join("\n");
}

const ENRICH_RULES = `ENRICHMENT-DRIVEN COACHING (many library lines carry tier / cns / contrast / finisher tags - USE them):
- ORDER every strength-based session by CNS cost, not by muscle: Warm Up/Mobility -> highest-CNS POWER/OLYMPIC work FIRST while fresh (never supersetted) -> PRIMARY compound (tier "Compound", cns High) -> SECONDARY / ACCESSORY (lower cns, higher reps) -> conditioning FINISHER last. Never place a plyo, clean, snatch or jump AFTER the heavy grind work.
- CONTRAST PAIRING (Performance & Fusion strength days ONLY): right after a heavy PRIMARY lift, pair its "contrast:" movement for 3-5 explosive reps (post-activation potentiation) using linkedToNext on the heavy set. Only on strength/power lifts, NEVER on conditioning. Do NOT use contrast pairing in Stronger or Foundations.
- ANTAGONIST SUPERSETS (density): superset a lift with an OPPOSING pattern (push<->pull, squat<->hinge) via linkedToNext on the first item - best on secondary/accessory work; NEVER superset the main heavy lift; NEVER in Foundations.
- FINISHER: when a session ends with a conditioning finisher, take it from the primary lift's "finisher:" tag; if that tag says "not a finisher - keep crisp" (plyo/olympic), do NOT add a finisher.
- RESPECT TIER for intensity: power/olympic = low reps, high quality, never to failure; primary compounds = heavy, leave 1-2 in reserve; accessory/isolation = higher reps, may push close to failure.`;

const INTENSITY_RULES = `STRENGTH INTENSITY & PROGRESSION (prescribe for EVERY working set - not just the main lift):
- LANGUAGE: give every working strength set an RPE with reps-in-reserve in the staffNotes, e.g. "@ RPE 8 (2 RIR)". On the main barbell lift you may also give a %1RM guide and "build to working weight". (Foundations NEVER exceeds RPE 7 - keep it gentle.)
- PRESCRIBE BY TIER / CNS (read the tier/cns tags on each library line):
  * Power / Olympic (tier Power/olympic, cns Very high): 3-6 x 1-3 reps, RPE 7-8, NEVER to failure, rest 2-3 min, explosive intent.
  * Primary strength (tier Compound, cns High): 3-5 x 3-6, RPE 7-9 (waves by week - see the week note), rest 2-3 min, controlled eccentric (tempo e.g. 3-0-1).
  * Secondary strength (Compound, cns Moderate-high/Moderate): 3-4 x 6-10, RPE 7-8, rest 90-120s, tempo 2-0-1.
  * Accessory / isolation: 2-4 x 10-15, RPE 8-9 (fine to push close to failure - this is the hypertrophy driver), rest 45-75s.
  * Carry: 3-4 x 20-40 m or 30-45 s, heavy but unbroken. Core: 2-4 x 10-15 or 30-45 s, RPE 7-8.
- Power/olympic stays crisp (quality, never to failure); accessories are where members push near failure.
- Put a TEMPO + short coaching cue in EVERY item's staffNotes.`;

const ENGINE_RULES = `ENGINE / CONDITIONING DESIGN (Performance MetCon/Engine days & Fusion Engine days - NOT strength-day finishers, which stay short & moderate 6-10 min):
- High volume comes from KEEPING MOVING: use light-to-moderate "unbroken" loads, NEVER grind weights; pace by repeatable EFFORT/RPE, never %1RM.
- STATION ROTATION: build from 3 roles and ALTERNATE so no two consecutive moves fatigue the same muscle: (1) monostructural (Row/Bike/Ski/Run), (2) loaded (KB swings, wall balls, thrusters, sled, carries, ball slams, DB snatch/clean), (3) gymnastic/bodyweight (burpees, box jumps, air squats, mountain climbers). Couplet = loaded+mono or loaded+gymnastic; triplet = one of each. NEVER two loaded lower-body moves back to back.
- FORMATS (rotate week to week, never repeat one): AMRAP; EMOM station rotation; Rounds For Time (time-capped); Chipper; "Every X mins x N" intervals; HYROX sim (run/erg + one station each round); cal ladder/pyramid. Put the FORMAT in the section description ("15 Min EMOM", "20 RFT cap 42 min", "Every 5 Mins x8").
- LONG engine (40-55 min): use STACKED blocks split by "Rest 5 Mins", OR a Rest station inside a long EMOM (e.g. 3 work + 1 Rest), OR a capped single piece - NEVER an unbroken 40-min grind. The longer the piece, the more erg/carry-dominant (less impact/plyo).
- SCORING & PACING: state a score ("Score = Total Cals", "For Time", "Time Cap X Mins"); mark a scored station "Max Cal [machine]". Put a PACING NOTE on EVERY engine block (effort/RPE, "settle into a pace you can repeat"). Dual male/female loads (@24/16kg, 18/12 cal) and per-side (10/10) notation.`;

const STRONGER_RULES = `STRONGER (hypertrophy PPL) specifics:
- NO contrast pairing and NO olympic/power work. Use ANTAGONIST SUPERSETS (push<->pull) on secondary/accessory work for density.
- Hypertrophy emphasis: one heavier strength anchor (4x5-8) then higher-rep accessories (3x10-15) taken CLOSE to failure (the growth driver).
- BALANCE each day via the Horizontal/Vertical push-pull tags: PUSH = a horizontal press AND a vertical (overhead) press; PULL = a vertical pull AND a horizontal row; LEGS = a knee (squat) AND a hinge AND a single-leg.
- Conditioning is AEROBIC ONLY (Mobility & Cardio day = Zone 2 / easy intervals) - never metcon/AMRAP/EMOM in Stronger.`;

const FUSION_RULES = `FUSION (strength-endurance hybrid) - the KEY correction:
- The AMRAP couplets are built from LOADED antagonist strength/hypertrophy movements (e.g. 10 DB Bench Press + 10 Bent Over Rows), NOT cardio. The constant back-and-forth of an antagonist pair (push<->pull, squat<->hinge) is what drives the heart rate. Cardio/gymnastic may be a THIRD accent move only, never the couplet base.
- Loads moderate & cycle-able (reps 8-15, "keep cycling, minimal rest; reps may drop, that's fine"), pace RPE 7-8 sustained, pacing note on every AMRAP block.
- Session shape: Warm Up -> Fire Up -> heavy Block 1 -> 1-2 antagonist AMRAP couplet blocks -> short erg "for time" finisher. Rotate the pair + Block 1 lift week to week.
- Fusion Engine days use the engine formats above but bias to erg/loaded stations over impact/plyo.`;

// Inject only the rule blocks relevant to the stream (keeps the prompt lean + on-message).
function buildSystem(exListStr: string, stream: string) {
  const blocks: any[] = [
    { type: "text", text: SYSTEM_PROMPT },
    { type: "text", text: ENRICH_RULES },
    { type: "text", text: INTENSITY_RULES },
  ];
  if (stream === "Performance" || stream === "Fusion") blocks.push({ type: "text", text: ENGINE_RULES });
  if (stream === "Stronger") blocks.push({ type: "text", text: STRONGER_RULES });
  if (stream === "Fusion") blocks.push({ type: "text", text: FUSION_RULES });
  blocks.push({ type: "text", text: `EXERCISE LIBRARY (use ONLY these ids):\n${exListStr}`, cache_control: { type: "ephemeral" } });
  return blocks;
}

// 4-week mesocycle wave for the MAIN lifts. Foundations stays gentle (no heavy RPE).
function waveLine(stream: string, week: number): string {
  if (stream === "Foundations") {
    return (week % 4 === 0)
      ? `WEEK ${week} is an EASY TECHNIQUE week - keep loads light, 2 sets, focus on form.`
      : `WEEK ${week}: progress gently vs last week - add a rep or a small load; reps stay 8-15, RPE 6-7.`;
  }
  const phase = (((week - 1) % 4) + 4) % 4;
  const P = [
    "BUILD week - main lifts RPE cap 7 (~70-75% 1RM), groove technique, full accessory volume.",
    "LOAD week - main lifts RPE 8 (~77-82%), add load vs the Build week, hold accessory volume.",
    "PUSH week - peak intensity: main lifts RPE 8-9 (~83-87%), trim accessory volume ~15%.",
    "DELOAD week - main lifts RPE 6 (~65%), cut total volume ~40-50%, prioritise recovery & technique.",
  ];
  return `WEEK ${week} is a ${P[phase]} Wave the MAIN lift accordingly; progress load/reps sensibly from the previous week (do not just repeat it).`;
}

function extractJson(text: string): any {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("No JSON object found in model response");
  return JSON.parse(text.slice(s, e + 1));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callClaude(apiKey: string, system: any[], userPrompt: string, think = false): Promise<any> {
  const reqBody: any = {
    model: MODEL,
    max_tokens: think ? 24000 : 16000,
    system,
    messages: [{ role: "user", content: userPrompt }],
  };
  if (think) reqBody.output_config = { effort: "medium" };
  else reqBody.thinking = { type: "disabled" };

  for (let attempt = 0; ; attempt++) {
    let resp: Response;
    try {
      resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify(reqBody),
      });
    } catch (netErr) {
      if (attempt < 3) { await sleep(2000 * (attempt + 1)); continue; }
      throw netErr;
    }
    if (resp.ok) {
      const data = await resp.json();
      const block = Array.isArray(data.content) ? data.content.find((b: any) => b.type === "text") : null;
      if (!block?.text) {
        if (attempt < 3) { await sleep(1500); continue; }
        throw new Error("No text block in model response: " + JSON.stringify(data).slice(0, 400));
      }
      try { return extractJson(block.text); }
      catch (parseErr) { if (attempt < 3) { await sleep(1000); continue; } throw parseErr; }
    }
    if ([429, 500, 502, 503, 529].includes(resp.status) && attempt < 3) {
      const retryAfter = Number(resp.headers.get("retry-after")) || 2 * (attempt + 1);
      await sleep(retryAfter * 1000);
      continue;
    }
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude API error ${resp.status}`);
  }
}

// ── Cross-programme memory ────────────────────────────────────────────────
const NON_MAIN = /warm ?up|mobility|fire ?up|conditioning|engine|metcon|amrap|zone|pump|core|recovery|stretch|easy conditioning|main work|move/i;
function deriveMemory(prevProgram: any[] | undefined, nameById: Map<string, string>) {
  const keep = new Set<string>(), avoid = new Set<string>();
  for (const cell of (prevProgram || [])) {
    let section = "", tookMain = false;
    for (const it of (cell.exercises || [])) {
      if (it.isSection) { section = String(it.name || "").toLowerCase(); continue; }
      const id = String(it.name);
      if (!tookMain && !NON_MAIN.test(section)) { tookMain = true; keep.add(id); }
      else avoid.add(id);
    }
  }
  const toName = (id: string) => nameById.get(id);
  return { keep: [...keep].map(toName).filter(Boolean) as string[], avoid: [...avoid].map(toName).filter(Boolean) as string[] };
}
function memoryContext(keep: string[], avoid: string[]): string {
  if (!keep.length && !avoid.length) return "";
  return `\n\nCROSS-PROGRAMME MEMORY (this is a NEW programme following a previous one - keep the big lifts, freshen the rest):\n- Main lifts from the last programme - you MAY reuse these movements so clients keep progressing the big lifts: ${keep.join(", ") || "(none)"}.\n- Everything else used last programme - prefer DIFFERENT exercises this time (keep the same purpose/patterns): ${avoid.join(", ") || "(none)"}.`;
}

// Generate the FULL weekly menu for the stream (one call), returns raw workouts by day.
async function generateWeek(
  apiKey: string, system: any[], program: any, week: number, prevWeek: any[] | undefined,
  keepThemes: string[] = [], avoid: string[] = [],
): Promise<any[]> {
  const menu = menuFor(program.stream);
  const dayLines = menu.map((m, i) => `Day ${i + 1} = ${m.type}`);
  const prevStr = prevWeek && prevWeek.length
    ? `\n\nPREVIOUS WEEK (progress load/intensity sensibly from this):\n${JSON.stringify(prevWeek.map((w) => ({ day: w.day, exercises: w.exercises })))}`
    : "";
  const prompt = `${program.stream} programme. Generate ALL ${menu.length} sessions for Week ${week}.
Sessions (build each in the ${program.stream} skeleton with the correct section names):
${dayLines.join("\n")}

${waveLine(program.stream, week)}${prevStr}${memoryContext(keepThemes, avoid)}

Return ONLY a JSON object, no markdown, no text outside it:
{ "workouts": [ { "week": ${week}, "day": <n>, "exercises": [ <items> ] } ] }
${ITEM_SHAPES}`;
  const parsed = await callClaude(apiKey, system, prompt);
  return parsed.workouts || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action, program, currentWorkouts, exercises, targetWorkoutIndex } = body;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set in Edge Function secrets.");

    const stream = String(program?.stream || "Stronger");
    const isFoundations = stream === "Foundations";
    const pool = isFoundations ? beginnerPool(exercises) : exercises;
    const cardioIds = cardioMachineIds(exercises); // one id per machine type (day-to-day variety)
    const cardioSet = cardioMachineIdSet(exercises); // every cardio-machine id (to strip extras from warm-ups)
    const mobilityIds = mobilityDrillIds(exercises, cardioSet); // "Warm Up"-tagged drills to top warm-ups up to 3

    const enrich = await fetchEnrichment(); // coaching-intelligence layer (best-effort)
    const system = buildSystem(buildExerciseList(pool, enrich), stream);
    const validIds = new Set(pool.map((e: any) => String(e.id)));
    const nameById = new Map<string, string>(exercises.map((e: any) => [String(e.id), e.name]));
    const { keep: keepThemes, avoid: avoidList } = deriveMemory(body.previousProgramWorkouts, nameById);
    const clean = (items: any[]) =>
      items.filter((e: any) => e.isSection || validIds.has(String(e.name))).map((e: any) => ({ ...e, id: Date.now() + Math.random() }));

    const updated = [...currentWorkouts];
    // Build a finished cell: clean -> (Foundations shaping) -> cardio warm-up -> tag name + dayCounts.
    const finishCell = (gw: any) => {
      const cell: any = { week: gw.week, day: gw.day, exercises: clean(gw.exercises) };
      if (isFoundations) {
        enforceFoundations(cell, cardioSet);
        ensureFoundationsCardioFinish(cell, cardioIds, cardioSet, (gw.day || 1) + 1); // easy cardio in Core & Finish (different machine to the warm-up)
      }
      filterStrengthBlocks(cell, exercises); // no conditioning-only moves inside a Strength Block / Block 1
      snapReps(cell); // clean rep values (4,5,6,8,10,12,15,20) - no 7/9/11/13/14
      ensureCardioWarmup(cell, cardioIds, cardioSet, (gw.day || 1) - 1, mobilityIds); // exactly ONE 3-min cardio, then EXACTLY 3 mobility
      cell.name = dayTypeFor(stream, gw.day || 1);        // theme title (Push, Full Body A, ...)
      cell.dayCounts = dayCountsFor(stream, gw.day || 1);  // which training frequencies show this session
      if (stream === "Stronger") enforcePushStrength(cell, exercises); // Push day: 4 strength incl. an overhead press
      if (isFoundations) addFoundationsRegressions(cell, exercises, enrich); // beginner "easier option" cues on Main Work
      return cell;
    };
    const mergeWeek = (gws: any[]) => {
      gws.forEach((gw: any) => {
        const cell = finishCell(gw);
        const idx = updated.findIndex((w) => w.week === gw.week && w.day === gw.day);
        if (idx !== -1) updated[idx] = { ...updated[idx], ...cell };
        else updated.push(cell);
      });
    };

    if (action === "single") {
      const t = currentWorkouts[targetWorkoutIndex] ?? { week: body.week ?? 1, day: body.day ?? 1 };
      const dayType = dayTypeFor(stream, t.day);
      const ctx: string[] = [];
      if (body.previousWeekWorkouts?.length) {
        const sameDay = body.previousWeekWorkouts.find((w: any) => w.day === t.day) ?? body.previousWeekWorkouts;
        ctx.push(`SAME DAY LAST WEEK (progress load/reps sensibly - do not just repeat it):\n${JSON.stringify(sameDay)}`);
      }
      if (body.weekSoFar?.length) {
        ctx.push(`DAYS ALREADY PROGRAMMED THIS WEEK (balance movement patterns across the week and do NOT reuse the same conditioning format):\n${JSON.stringify(body.weekSoFar.map((w: any) => ({ day: w.day, exercises: w.exercises })))}`);
      }
      const prompt = `${stream} programme, Week ${t.week}${program.weeks ? " of " + program.weeks : ""}. Session Day ${t.day} = ${dayType} in the ${stream} skeleton.
${waveLine(stream, t.week)}
Apply these block progression & variety rules:
- MAIN LIFT: keep the SAME movement pattern as this session in earlier weeks and PROGRESS it (wave load/reps/scheme across the block).
- WARM UP/MOBILITY and FIRE UP: choose DIFFERENT exercises from last week (same purpose/patterns).
- ACCESSORIES and CONDITIONING: keep them varied across the block; vary the conditioning format.
- Use supersets (linkedToNext:true) sparingly on antagonist pairs; never the main heavy lift.
${ctx.join("\n\n")}${memoryContext(keepThemes, avoidList)}

Return ONLY JSON, no markdown:
{ "workouts": [ { "week": ${t.week}, "day": ${t.day}, "exercises": [ <items> ] } ] }
${ITEM_SHAPES}`;
      const parsed = await callClaude(apiKey, system, prompt, true);
      const gw = parsed.workouts?.[0];
      if (gw) mergeWeek([{ week: t.week, day: t.day, exercises: gw.exercises }]);

    } else if (action === "week") {
      mergeWeek(await generateWeek(apiKey, system, program, body.week, body.previousWeekWorkouts, keepThemes, avoidList));

    } else if (action === "full_program") {
      let prev: any[] = [];
      for (let w = 1; w <= program.weeks; w++) {
        const gws = await generateWeek(apiKey, system, program, w, prev, keepThemes, avoidList);
        mergeWeek(gws);
        prev = gws;
      }
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ workouts: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
