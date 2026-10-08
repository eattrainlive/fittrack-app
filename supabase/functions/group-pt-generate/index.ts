// Supabase Edge Function: generate-group-pt  (12-week Group PT blocks)
// Deploy:  supabase functions deploy generate-group-pt
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Optional: supabase secrets set ALLOWED_ORIGIN=https://etlfittrack.netlify.app
//
// WHAT THIS BUILDS
// A block = 4 distinct TEMPLATE WEEKS, each repeated 3x: weeks 1=5=9, 2=6=10, 3=7=11, 4=8=12.
// Within a week the DAYS are all different (balanced full-body, patterns spread across the week).
// The generator builds one template week at a time (all its distinct days in a single call),
// then STAMPS rounds 2 & 3 (weeks +4, +8) deterministically in code: same exercises, reps waved
// DOWN with a load-up cue. That guarantees the exercises stay identical across the three rounds
// (client chases weight on the same lift) while progression is added.
//
// PROGRESSION (across the three rounds, per block)
//   Compound Lift (1st item of the Lift pair): R1 base -> R2 4x6 -> R3 5x4-5 (heaviest).
//   Burn 1 / Burn 2 rep-based strength items:  R1 base -> reps reduce (R2 -2 floor 8, R3 -4 floor 6).
//   Finisher / timed / distance / calorie work: reps left as authored, "increase load/effort" cue only.
//   Warm Up / Fire Up / the Lift core partner: unchanged.
//
// TRACKING FIELDS (match the workout builder so the app tracks them the same way)
//   Rep work:      reps (a number, or per-side "10/10"), weight optional.
//   Timed/holds:   timeMins / timeSecs (e.g. a 60s plank = timeSecs 60, reps 0).
//   Distance:      distance in metres (carries, runs).
//   Calorie work:  reps = the calorie count on a named machine (e.g. Bike Erg, reps 15 = 15 cal).
//
// SESSION SKELETON (every session, in order)
//   Warm Up (3 solo) -> Fire Up (1 pair) -> Lift (compound + simple core/accessory)
//   -> Burn 1 (upper PUSH + lower hinge) -> Burn 2 (upper PULL + lower knee) -> Finisher (accessory+conditioning pairs)
//
// ── BUILDER NOTES (frontend) ─────────────────────────────────────────────
// Full block: loop TEMPLATE WEEK by template week, one call each:  action:"week", cycleWeek:cw  (cw = 1..4).
//   Each call builds all the distinct days for that template week and fills weeks cw, cw+4, cw+8.
// Edit one cell: action:"single", targetWorkoutIndex (rebuilds that one day's base session and re-stamps its 3 rounds).
// Request: { action, program:{weeks:12,days}, currentWorkouts:[...grid...], exercises:[...library...], cycleWeek?, targetWorkoutIndex? }
// Response: { workouts: updatedGrid }   (grid cell = { week, day, exercises:[...] })
// ─────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "claude-sonnet-5";
const WEEKS = 12;
const CYCLE = 4; // 4 distinct template weeks, each repeated 3x

// PT-area equipment rule: exclude fixed resistance machines (leg press, lat pulldown, leg
// extension, hack squat, chest press machine, Smith, etc.). Cables & functional trainers are
// tagged separately so they're kept. Cardio ergs are ALSO tagged "Machine" but we KEEP those.
const ERG_KEEP = /(erg|air ?bike|assault bike|stair ?master|treadmill|\brower\b)/i;
function equipmentAllowed(ex: any): boolean {
  const eq = (Array.isArray(ex.equipment) ? ex.equipment.join(",") : (ex.equipment ?? "")).toString();
  if (!/machine/i.test(eq)) return true;          // not a machine -> allowed (cable, free weights, bands, bodyweight…)
  return ERG_KEEP.test(String(ex.name ?? ""));    // machine but a cardio erg -> keep; any other machine -> drop
}

const SYSTEM_PROMPT = `You are the head coach's programming assistant for Eat Train Live, building 12-week GROUP PT blocks in the house style. Select ONLY from the provided exercise library and reference every exercise by its id.

A block is 4 DISTINCT template weeks that later repeat; you design ONE template week at a time - all of its days at once. Progression across the block is added later in code, so DO NOT progress within or across the weeks yourself - just build good, DISTINCT sessions.

Organise everything by MOVEMENT PATTERN, never by body-part split. Every session is a balanced full-body workout.

6-DAY DROP-IN MODEL (critical): this is a drop-in programme - members attend ANY 1-3 of the week's days, not a fixed split. So design for two things at once:
 (a) EVERY single day must be a COMPLETE, self-contained, balanced full-body session - the Lift (one heavy compound) plus the two Burns together train squat, hinge, push AND pull - so a member who comes only ONCE that week still hits every major pattern.
 (b) ACROSS the week's days you must ROTATE the LIFT'S HEAVY PATTERN so the week covers all FOUR heavy patterns - a heavy SQUAT (Knee), a heavy HINGE/DEADLIFT (Hip), a heavy UPPER PRESS (Push), and a heavy UPPER ROW/PULL (Pull) - plus variations (over 6 days aim ~2 lower-compound days, ~1-2 press days, ~1-2 row/pull days). Also rotate horizontal vs vertical for the presses/pulls and the squat/hinge variations, and rotate the Finisher's accessory emphasis. No two days share the same Lift or the same burn pairing.

Build each day in this exact block order, using these exact block names:
1. Warm Up - a short cardio machine (the app adds/varies this) PLUS 3 mobility/prep moves that PRIME the day's Lift compound (use the compound's "prep:" drills where the library gives them). Because the Lift pattern rotates across the week, the PREP MUST rotate with it: a press day primes shoulders/t-spine, a squat day hips/ankles, a hinge day hamstrings/hips, a row day upper back/lats. Do NOT reuse the same mobility drills every day - pick DIFFERENT prep drills on each day of the week so the warm-ups stay varied. Run SOLO (linkedToNext:false). 1 set.
2. Fire Up - 1 activation SUPERSET pair (first item linkedToNext:true), ~2 sets.
3. Lift - the heavy STRENGTH anchor of the day, and its PATTERN ROTATES across the week (see the rotation rule above). It is ONE genuinely LOADED, heavy compound - EITHER a SQUAT (Knee), a HINGE/DEADLIFT/hip-thrust (Hip), an UPPER PRESS (Push - Bench/DB Press, Overhead/Push Press), OR an UPPER ROW/weighted pull-up (Pull - BB/DB/Pendlay Row, Weighted Pull-Up). PREFER items tagged tier "Compound" / cns "High"; barbell/DB/KB loaded. NEVER an activation/bodyweight move (glute bridge, marching, banded, bird dog, dead bug, hollow) and NEVER an isolation (curl, raise, fly, pushdown). Pair it with a SIMPLE, EASY-TO-COACH partner - a CORE hold/anti-rotation, a CARRY, or a single-joint ACCESSORY (e.g. Pallof press, farmer/suitcase carry, weighted plank, dead bug, DB curl) - low-skill so the coach can watch the room while members work the main lift. The partner must NOT be a MOBILITY/warm-up drill (no "shoulder sheer", stretches, dislocates, capsule work), must NOT be another heavy compound, and must NOT repeat the Lift's own pattern. VARY the partner across the week - do NOT put the same partner move on more than one day. First item = the compound (linkedToNext:true), second = the simple partner. 4 sets, rest ~90s.
4./5. Burn 1 & Burn 2 - two MIXED upper/lower supersets that, TOGETHER WITH THE LIFT, guarantee the session trains push, pull, squat AND hinge. Each burn pairs an UPPER with a LOWER (one recovers while the other works). The upper focus is FIXED so the split is predictable:
   - Burn 1 = an upper PUSH + a lower HINGE/posterior. For the hinge, ROTATE across the week - RDL, hip thrust, good morning, kettlebell swing, single-leg deadlift, kettlebell deadlift, back extension. Use a GLUTE BRIDGE sparingly (at most ONE day in the week), never the default hinge every day.
   - Burn 2 = an upper PULL + a lower KNEE/squat (or a push-pattern lower like a lunge/step-up). Burn 2 MUST ALWAYS contain a genuine upper PULL - a row, pull-up/chin-up, pulldown, or face pull. NEVER fill Burn 2's upper slot with a CORE/midline move (crunch, dead bug, bicycle, plank, oblique, leg raise, russian twist) - core belongs in the Finisher, not here.
   - If the LIFT itself is a press or a row, still keep Burn 1's push / Burn 2's pull, but pick a DIFFERENT variation and angle from the Lift (e.g. Lift = Pendlay Row -> Burn 2 pull = chest-supported DB row or face pull; Lift = Bench -> Burn 1 push = incline DB or landmine press). A little extra push/pull volume is fine - do NOT drop the pull to core to avoid it.
   Set linkedToNext:true on the FIRST item of each pair. ~3 sets each. VARY the actual exercises across the week - do NOT reuse the SAME movement (e.g. the same glute bridge, the same row) as a Burn partner on more than one day; pick different hinge/knee/push/pull variations each day.
6. Finisher - this block is a CHOICE: give the client TWO alternative supersets and they pick ONE. Produce EXACTLY two superset pairs, each internally coherent. NEVER mix a cardio/conditioning move with an upper-body lift in the same pair.
   - OPTION A = a light "PUMP & CARRY" accessory blast: simple, not heavy or technical, but a good burn to finish. Pair TWO COMPLEMENTARY moves that hit DIFFERENT areas from across this pool: SHOULDERS (lateral / front / rear-delt raise, upright row, plate raise), BICEPS, TRICEPS, UPPER BACK (face pull, band pull-apart), and loaded CARRIES (farmer / suitcase / waiter / front-rack / overhead carry). Mix the areas - e.g. lateral raise + face pull, triceps pushdown + biceps curl, or a carry + a shoulder/arm move. Do NOT default to biceps + triceps every day - ROTATE the emphasis across the week (delts one day, a carry another, upper-back another). Light-moderate load, higher reps (12-20); prescribe carries by distance or time. No cardio machine in Option A.
   - OPTION B = a CARDIO/CORE superset: a conditioning/cardio move paired with a CORE move (e.g. KB Swings + Hanging Knee Raise; Bike Erg + Plank; Ball Slams + Dead Bug; Wall Balls + Windshield Wipers).
   First item of EACH pair has linkedToNext:true. Mark them so the coach can offer the choice: begin the first item's staffNotes of Option A with "OPTION A (accessory) - " and Option B's with "OPTION B (cardio/core) - ". Set the "Finisher" section's description to "Choose ONE option". ~3 sets each.

Each Burn block may be delivered LIFTING style (accessory/strength) OR CARDIO style (functional + machine: Bike/Ski/Row erg, Ball Slams, KB Swings, carries, Box Step Ups). Vary the style across the days.

Pairing is always COMPLEMENTARY and mixes upper with lower: compound+core (Lift, pattern rotates squat/hinge/press/row across the week), then Burn 1 = upper PUSH + lower hinge and Burn 2 = upper PULL + lower knee (Burn 2 always carries a real pull, never core). The Finisher is two OPTION supersets - accessory+accessory (Option A) and cardio+core (Option B) - never mixing cardio with an upper-body lift. Set linkedToNext:true on the FIRST item of every pair; the second is the paired partner.

EQUIPMENT: this is a PT-area block. Fixed resistance machines (leg press, lat pulldown, leg extension, hamstring curl, hack squat, chest press machine, Smith machine, pec deck, glute drive, etc.) are NOT available and have been removed from your library - do not ask for them. What you DO have: barbells, dumbbells, kettlebells, CABLES and functional trainers, bands, bodyweight, sleds, wall balls, boxes, and cardio ergs (Bike Erg, Rower, Ski Erg, Air Bike) for conditioning.

LOADED-ONLY IN LIFT & BURNS: the Lift, Burn 1 and Burn 2 blocks must use only LOADED exercises - barbell, dumbbell, kettlebell, cable/functional-trainer, or wall ball. Do NOT put bodyweight-only or banded movements in the Lift or Burns. The ONLY bodyweight exceptions permitted there are Pull-Ups, Chin-Ups and Ring/Inverted Rows. All other bodyweight and banded work (glute bridges, bird dogs, banded pull-aparts, planks, crunches, mobility) belongs in Warm Up, Fire Up or the Finisher's core/cardio option - never in the Lift or Burns.

EVERY exercise item MUST carry a prescription - never leave one blank. Each exercise needs sets>=1 AND exactly one of: reps (a number >0, or per-side "10/10"), OR timeMins/timeSecs, OR distance, OR reps as a calorie count. An exercise with reps 0 and no time/distance is invalid.

PRESCRIBE using the TRACKING FIELDS so the app can track each movement - pick the right field for the movement:
- Rep work: set "reps" to a number, or per-side like "10/10" (set eachSide:true); "weight" only if you prescribe a load; leave timeMins/timeSecs/distance at 0.
- Timed work / holds (e.g. plank, dead hang, a timed carry): set "timeMins" and/or "timeSecs" (a 60-second plank = timeSecs 60, timeMins 0) and set "reps" to 0. Do NOT write "60sec" into reps.
- Distance work (carries, runs, sled): set "distance" (metres) and reps 0.
- Calorie machine work (Bike Erg, Ski, Row, Air Bike): set "reps" to the calorie count and name the machine as the exercise (e.g. reps 15 = 15 cal). Use dual male/female where relevant in staffNotes (e.g. "18/12 cal").
Always set "rest" (seconds). Put a short coaching cue in staffNotes where useful (especially the compound lift). Warm Up 1 set; Fire Up 2 sets; Lift 4 sets ~8 reps; Burn/Finisher 3 sets ~12 reps as sensible starting points.

Many library lines carry extra tags: tier / cns (movement demand) and prep (mobility/activation drills for that pattern). USE them - pick a tier "Compound" / cns "High" movement for the Lift, and build the Warm Up from the Lift compound's "prep:" drills. These tags are guidance, not exercises to name.`;

const ITEM_SHAPES = `Section item:  { "isSection": true, "name": "Lift", "sectionType": "Normal", "description": "" }
Exercise item: { "blockType": "Lift", "name": "<exercise id>", "sets": 4, "reps": 8, "weight": 0, "distance": 0, "timeMins": 0, "timeSecs": 0, "rest": 90, "linkedToNext": true, "eachSide": false, "staffNotes": "" }
blockType is one of: "Warm Up" | "Fire Up" | "Lift" | "Burn 1" | "Burn 2" | "Finisher".
Examples of tracked prescriptions:
  60s plank ->  "reps": 0, "timeSecs": 60, "timeMins": 0
  15 cal Bike Erg -> "reps": 15  (name the exercise the machine; note "18/12 cal" in staffNotes if dual)
  50m Farmer Carry -> "reps": 0, "distance": 50
  10 per side lunge -> "reps": "10/10", "eachSide": true`;

// movementType tags as string[]. Robust to ALL shapes: a real array (["Hip","Push"]), an array whose
// elements are themselves ";"-joined ("["Hip; Fire Up"]" - which the app's save logic can produce),
// or a plain ";"/"," string. We JOIN then SPLIT so a tag like "Hip; Fire Up" always becomes ["Hip","Fire Up"].
function mtOf(e: any): string[] {
  const raw = Array.isArray(e?.movementType) ? e.movementType.join(";") : String(e?.movementType ?? "");
  return raw.split(/[;,]/).map((s: string) => s.trim()).filter(Boolean);
}
// Normalised MOVEMENT key: strips equipment / grip / side words so variations of the SAME movement
// collapse together (e.g. "Barbell Glute Bridge" = "Dumbbell Glute Bridge" = "DB/KB Glute Bridge"
// -> "glute bridge"). Used for cross-day variety so the week can't stack three glute-bridge variants.
// Movement-descriptive words (incline, floor, bench, bent over, pendlay, goblet, cycle, split…) are
// KEPT, so genuinely different movements stay distinct.
const EQUIP_GRIP = /\b(db|kb|bb|dumbbell|dumbell|kettlebell|barbell|cable|banded|band|machine|smith|landmine|plate|weighted|bodyweight|bw|sa|single[- ]?arm|single|double|dual|wall ?ball|med ?ball|ball|sled|trap ?bar|ez ?bar|ez|neutral grip)\b/g;
function moveKey(name: string): string {
  return String(name || "").toLowerCase()
    .replace(/\s*-\s.*$/, "")   // drop a " - Floor" / "- Functional Trainer" style variant suffix
    .replace(EQUIP_GRIP, " ")
    .replace(/[^a-z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Enrichment (coaching-intelligence layer). Best-effort - generator still works without it.
async function fetchEnrichment(): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return map;
  try {
    const resp = await fetch(`${url}/rest/v1/exercise_enrichment?select=exercise_id,tier,cns,warmup_prep`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!resp.ok) return map;
    for (const r of await resp.json()) map.set(String(r.exercise_id), r);
  } catch (_e) { /* optional */ }
  return map;
}
function buildExerciseList(exercises: any[], enrich?: Map<string, any>): string {
  return exercises.map((ex) => {
    const mv = Array.isArray(ex.movementType) ? ex.movementType.join(",") : (ex.movementType ?? "");
    let line = `- ${ex.name} | id:${ex.id} | movement:${mv} | equip:${ex.equipment ?? ""}`;
    const en = enrich?.get(String(ex.id));
    if (en) {
      const bits: string[] = [];
      if (en.tier) bits.push(`tier:${en.tier}`);
      if (en.cns) bits.push(`cns:${en.cns}`);
      if (en.warmup_prep && en.warmup_prep !== "—") bits.push(`prep:${en.warmup_prep}`);
      if (bits.length) line += ` | ${bits.join(" | ")}`;
    }
    return line;
  }).join("\n");
}

// Guard: the Lift's FIRST item must be a genuine HEAVY, LOADED compound - a squat, hinge, upper
// press OR upper row/pull. NOT an activation move (glute bridge / marching / banded / bodyweight)
// and NOT an isolation (curl / raise / fly / pushdown). If light/off, swap for a real compound,
// preferring the SAME pattern family so the day's intended pattern is kept.
const LIGHT_LIFT = /glute bridge|sprinter bridge|marching|banded|bodyweight|\bbw\b|bird ?dog|dead ?bug|hollow|\bclam\b|monster walk|donkey|\bcurls?\b|lateral raise|front raise|rear delt|\bflye?\b|pushdown|push down|kickback|shrug|plank|pull ?through|pull ?thru|\bdrag\b|windmill|pallof|\bcrunch|russian twist|leg raise|sit ?up/i;
// Heavy-compound name patterns by family.
const FAM_PAT: Record<string, RegExp> = {
  knee: /squat|\blunge\b|split squat|step ?up/i,
  hip:  /deadlift|\brdl\b|romanian|hip thrust|good morning|\bswing\b|clean|thruster/i,
  push: /bench press|chest press|floor press|overhead press|shoulder press|strict press|push press|\bz[- ]?press\b|arnold press|\bdips?\b/i,
  pull: /\brows?\b|pendlay|pull ?up|chin ?up|pulldown|high pull/i,
};
const HEAVY_LIFT = new RegExp([FAM_PAT.knee, FAM_PAT.hip, FAM_PAT.push, FAM_PAT.pull].map((r) => r.source).join("|"), "i");
// Press ANGLE within the push family - so the Lift press rotates and isn't always a chest press.
const VPUSH = /overhead press|shoulder press|strict press|push press|\bz[- ]?press\b|arnold press|military|landmine press|push jerk|\bjerk\b/i; // vertical / overhead
const HPUSH = /bench press|chest press|floor press|incline.*press|decline.*press|\bdips?\b/i;                                              // horizontal / chest
// Classify a push name: "V" overhead, else "H" (chest). Non-press names return null upstream.
const pushOrient = (nm: string): "V" | "H" => (VPUSH.test(nm) ? "V" : "H");
function famOf(e: any): string | null {
  const t = mtOf(e || {});
  if (t.includes("Hip")) return "hip";
  if (t.includes("Knee")) return "knee";
  if (t.some((x: string) => /Push/.test(x))) return "push";
  if (t.some((x: string) => /Pull/.test(x))) return "pull";
  return null;
}
function guardLiftCompound(cell: any, exercises: any[], enrich: Map<string, any>) {
  const exById = new Map<string, any>(exercises.map((e: any) => [String(e.id), e]));
  const STRENGTH = ["Knee", "Hip", "Push", "Horizontal Push", "Vertical Push", "Pull", "Horizontal Pull", "Vertical Pull"];
  const isCompound = (e: any) => {
    if (!e) return false;
    const nm = String(e.name || "");
    const hasPattern = mtOf(e).some((t: string) => STRENGTH.includes(t));
    const en = enrich.get(String(e.id));
    const looksHeavy = HEAVY_LIFT.test(nm) || (en && (/compound/i.test(en.tier || "") || /high/i.test(en.cns || "")));
    return hasPattern && looksHeavy && !LIGHT_LIFT.test(nm);
  };
  const exs = cell.exercises || [];
  const i = exs.findIndex((e: any) => e.isSection && /^lift$/i.test(String(e.name || "")));
  if (i === -1) return;
  const ci = exs.findIndex((e: any, k: number) => k > i && !e.isSection);
  if (ci === -1) return;
  const cur = exById.get(String(exs[ci].name));
  if (isCompound(cur)) return; // already a proper heavy compound (any of squat/hinge/press/row)
  const used = new Set(exs.filter((x: any) => !x.isSection).map((x: any) => String(x.name)));
  const wantFam = famOf(cur); // keep the day's intended pattern where we can
  const pickFrom = (fam: string | null) => exercises.find((e: any) => {
    if (used.has(String(e.id))) return false;
    if (!isCompound(e)) return false;
    return fam ? FAM_PAT[fam].test(String(e.name || "")) : true;
  });
  // Name-based compound test (robust to tag problems): a heavy-compound NAME that isn't a light move.
  const nameCompound = (e: any) => { const nm = String(e.name || ""); return HEAVY_LIFT.test(nm) && !LIGHT_LIFT.test(nm); };
  const pickName = (allowUsed: boolean) => exercises.find((e: any) => (allowUsed || !used.has(String(e.id))) && nameCompound(e));
  const pick =
    (wantFam && pickFrom(wantFam)) || pickFrom("knee") || pickFrom("hip") || pickFrom(null) ||
    pickName(false) ||   // any unused heavy-compound by name (works even if tags are off)
    pickName(true);      // LAST RESORT: any heavy compound even if already used - never leave a glute bridge as the Lift
  if (pick) exs[ci] = { ...exs[ci], name: pick.id, staffNotes: `${exs[ci].staffNotes || ""} Heavy compound - build to a working weight.`.trim() };
}

// Guard: when the day's Lift is a PUSH, rotate the press ANGLE across the block so it isn't always a
// chest press. Target alternates by (templateWeek + day) parity so overhead presses recur; a same-week
// second press day is flipped to the opposite angle. Only swaps if an unused library press of the
// wanted angle exists (else leaves the Lift as-is). Decided on the base cell, before round-stamping,
// so all 3 rounds inherit the same choice.
function guardLiftPressVariety(cell: any, exercises: any[], otherDays: any[], cw: number) {
  const exById = new Map<string, any>(exercises.map((e: any) => [String(e.id), e]));
  const liftCompoundName = (exsArr: any[]): string | null => {
    const li = exsArr.findIndex((e: any) => e.isSection && /^lift$/i.test(String(e.name || "")));
    if (li === -1) return null;
    const c = exsArr.find((e: any, k: number) => k > li && !e.isSection);
    if (!c) return null;
    return String(exById.get(String(c.name))?.name || c.name || "");
  };
  const exs = cell.exercises || [];
  const i = exs.findIndex((e: any) => e.isSection && /^lift$/i.test(String(e.name || "")));
  if (i === -1) return;
  const ci = exs.findIndex((e: any, k: number) => k > i && !e.isSection);
  if (ci === -1) return;
  const cur = exById.get(String(exs[ci].name));
  if (!cur) return;
  const curName = String(cur.name || "");
  const isPush = FAM_PAT.push.test(curName) || famOf(cur) === "push";
  if (!isPush) return;                                   // only act on press-Lift days
  const curOri = pushOrient(curName);
  // Base target: alternate by (templateWeek + day) so the block mixes chest and overhead.
  let desired: "V" | "H" = ((cw + (Number(cell.day) || 1)) % 2 === 0) ? "V" : "H";
  // If another press day this week already uses `desired`, flip to keep the week varied.
  const otherPressOris = (otherDays || [])
    .map((w: any) => { const nm = liftCompoundName(w.exercises || []); return nm && FAM_PAT.push.test(nm) ? pushOrient(nm) : null; })
    .filter(Boolean) as ("V" | "H")[];
  if (otherPressOris.includes(desired) && !otherPressOris.includes(desired === "V" ? "H" : "V")) {
    desired = desired === "V" ? "H" : "V";
  }
  if (curOri === desired) return;                        // already the wanted angle
  const used = new Set(exs.filter((x: any) => !x.isSection).map((x: any) => String(x.name)));
  const pat = desired === "V" ? VPUSH : HPUSH;
  const pick = exercises.find((e: any) =>
    !used.has(String(e.id)) && pat.test(String(e.name || "")) && !LIGHT_LIFT.test(String(e.name || "")));
  if (pick) exs[ci] = { ...exs[ci], name: pick.id, staffNotes: `${exs[ci].staffNotes || ""} ${desired === "V" ? "Overhead" : "Horizontal"} press - rotate press angle across the block.`.trim() };
}

// Guard: rotate BURN 1's push angle too, so it isn't a chest press every day. Targets the OPPOSITE
// angle to the Lift on the same day (so one day isn't all-overhead or all-chest) and won't reuse a
// push already in this session or the week's other days' burns. Only swaps if a loaded, non-mobility
// press of the wanted angle is free; otherwise leaves it.
function guardBurn1PressAngle(cell: any, exercises: any[], otherDays: any[], cw: number) {
  const exById = new Map<string, any>(exercises.map((e: any) => [String(e.id), e]));
  const exs = cell.exercises || [];
  const i = exs.findIndex((e: any) => e.isSection && /^burn\s*1$/i.test(String(e.name || "")));
  if (i === -1) return;
  const items: number[] = [];
  for (let k = i + 1; k < exs.length && !exs[k].isSection; k++) items.push(k);
  const pushIdx = items.find((k) => {
    const e = exById.get(String(exs[k].name));
    return e && (FAM_PAT.push.test(String(e.name || "")) || famOf(e) === "push");
  });
  if (pushIdx === undefined) return;
  const cur = exById.get(String(exs[pushIdx].name));
  const curOri = pushOrient(String(cur?.name || ""));
  const target: "V" | "H" = ((cw + (Number(cell.day) || 1)) % 2 === 0) ? "H" : "V"; // opposite of the Lift target
  if (curOri === target) return;
  const usedKeys = new Set<string>();
  for (const x of exs) if (!x.isSection) usedKeys.add(moveKey(String(x.name)));
  for (const w of otherDays || []) for (const k of burnItemIdxs(w.exercises || [])) usedKeys.add(moveKey(String((w.exercises[k] || {}).name)));
  const usedIds = new Set(exs.filter((x: any) => !x.isSection).map((x: any) => String(x.name)));
  const pat = target === "V" ? VPUSH : HPUSH;
  const pick = exercises.find((e: any) => {
    const nm = String(e.name || "");
    if (usedIds.has(String(e.id)) || usedKeys.has(moveKey(nm))) return false;
    return pat.test(nm) && isLoadedForBurn(e) && !isMobilityMove(e) && !LIGHT_LIFT.test(nm);
  });
  if (pick) exs[pushIdx] = { ...exs[pushIdx], name: pick.id };
}

// Guard: Burn 2 must contain a genuine upper PULL (row / pull-up / pulldown / face pull), never
// only core. The model sometimes fills Burn 2 with a lower + a core move; if no pull is present,
// convert the core item (or the first item) into an unused library pull.
const PULL_NAME = /\brows?\b|pendlay|pull ?up|chin ?up|pulldown|lat pull|face ?pull|high pull|inverted row|ring row|seal row|renegade|batwing/i;
const CORE_NAME = /crunch|plank|dead ?bug|bicycle|russian twist|sit ?up|hollow|oblique|leg raise|knee tuck|tuck up|windshield|bird ?dog|v-? ?up|flutter|toe touch|mountain climber|side plank|ab wheel|roll ?out/i;
function isPullMove(e: any): boolean {
  if (!e) return false;
  if (mtOf(e).some((t: string) => /pull/i.test(t))) return true;   // tag-based (Pull / Horizontal Pull / Vertical Pull)
  return PULL_NAME.test(String(e.name || ""));
}
function isCoreMove(e: any): boolean {
  if (!e) return false;
  if (mtOf(e).some((t: string) => /^core$/i.test(t))) return true;
  return CORE_NAME.test(String(e.name || ""));
}
function guardBurn2Pull(cell: any, exercises: any[]) {
  const exById = new Map<string, any>(exercises.map((e: any) => [String(e.id), e]));
  const exs = cell.exercises || [];
  const i = exs.findIndex((e: any) => e.isSection && /^burn\s*2$/i.test(String(e.name || "")));
  if (i === -1) return;
  const items: number[] = [];
  for (let k = i + 1; k < exs.length && !exs[k].isSection; k++) items.push(k);
  if (!items.length) return;
  const resolve = (k: number) => exById.get(String(exs[k].name));
  if (items.some((k) => isPullMove(resolve(k)))) return;           // already has a pull -> leave it
  const coreSlot = items.find((k) => isCoreMove(resolve(k)));
  const slot = coreSlot ?? items[0];                              // convert the core item, else the first
  const used = new Set(exs.filter((x: any) => !x.isSection).map((x: any) => String(x.name)));
  const pick = exercises.find((e: any) =>
    !used.has(String(e.id)) && isPullMove(e) && !LIGHT_LIFT.test(String(e.name || "")));
  if (pick) exs[slot] = { ...exs[slot], name: pick.id, staffNotes: `${exs[slot].staffNotes || ""} Upper pull.`.trim() };
}

// Guard: Burn 1 must be an upper PUSH + a lower HINGE/posterior - never two of the same pattern
// (e.g. two chest presses). Keep an existing push and an existing lower; fill whatever's missing
// from the library (loaded, unused).
function guardBurn1PushHinge(cell: any, exercises: any[]) {
  const exById = new Map<string, any>(exercises.map((e: any) => [String(e.id), e]));
  const exs = cell.exercises || [];
  const i = exs.findIndex((e: any) => e.isSection && /^burn\s*1$/i.test(String(e.name || "")));
  if (i === -1) return;
  const items: number[] = [];
  for (let k = i + 1; k < exs.length && !exs[k].isSection; k++) items.push(k);
  if (items.length < 2) return;                       // block-count guard handles short blocks
  const famAt = (k: number) => famOf(exById.get(String(exs[k].name)));
  const nameAt = (k: number) => String(exById.get(String(exs[k].name))?.name || "");
  let keepPush = -1, keepLower = -1;
  for (const k of items) {
    if (keepPush < 0 && famAt(k) === "push") keepPush = k;
    // a real loaded LOWER (hinge/knee) - NOT a core/plank/pull-through move even if it's tagged hip
    else if (keepLower < 0 && (famAt(k) === "hip" || famAt(k) === "knee") && !CORE_NAME.test(nameAt(k))) keepLower = k;
  }
  if (keepPush >= 0 && keepLower >= 0) return;         // already push + lower
  const used = new Set(exs.filter((x: any) => !x.isSection).map((x: any) => String(x.name)));
  const pick = (want: "push" | "hip") => exercises.find((e: any) =>
    !used.has(String(e.id)) && isLoadedForBurn(e) && !isMobilityMove(e) && !CORE_NAME.test(String(e.name || "")) && famOf(e) === want);
  const need: ("push" | "hip")[] = [];
  if (keepPush < 0) need.push("push");
  if (keepLower < 0) need.push("hip");                 // prefer a hinge for the lower
  const toFix = items.filter((k) => k !== keepPush && k !== keepLower);
  for (const slot of toFix) {
    const role = need.shift();
    if (!role) break;
    const p = pick(role);
    if (p) { exs[slot] = { ...exs[slot], name: p.id }; used.add(String(p.id)); }
  }
}

// Guard: the Lift and Burn blocks must use LOADED exercises only (barbell/dumbbell/kettlebell/
// cable/wall ball). Bodyweight-only and banded moves are NOT allowed in Lift/Burn - the only
// bodyweight exceptions are Pull-Ups / Chin-Ups / Ring/Inverted Rows. Any offending item is
// swapped for a loaded library exercise of the SAME movement pattern where possible. (Bodyweight
// and banded moves stay available everywhere else and as swap alternatives.)
const BW_BAND_EQUIP = /bodyweight|band/i;                       // equipment we exclude from Lift/Burn
const ALLOWED_BW_PULL = /pull ?up|chin ?up|ring row|inverted row/i; // the permitted bodyweight pulls
function isLoadedForBurn(e: any): boolean {
  if (!e) return false;
  const eq = String(e.equipment || "");
  if (BW_BAND_EQUIP.test(eq)) return ALLOWED_BW_PULL.test(String(e.name || "")); // bodyweight/band ok only if it's a pull-up/ring row
  return true;                                                   // dumbbell / barbell / kettlebell / cable / wall ball = loaded
}
function guardLoadedLiftBurn(cell: any, exercises: any[]) {
  const exById = new Map<string, any>(exercises.map((e: any) => [String(e.id), e]));
  const exs = cell.exercises || [];
  const isBurnOrLift = (nm: string) => /^lift$/i.test(nm) || /^burn\s*[12]$/i.test(nm);
  for (let s = 0; s < exs.length; s++) {
    if (!(exs[s].isSection && isBurnOrLift(String(exs[s].name || "")))) continue;
    for (let k = s + 1; k < exs.length && !exs[k].isSection; k++) {
      const cur = exById.get(String(exs[k].name));
      if (!cur || isLoadedForBurn(cur)) continue;               // fine as-is
      const fam = famOf(cur);                                   // keep the movement pattern where we can
      const used = new Set(exs.filter((x: any) => !x.isSection).map((x: any) => String(x.name)));
      const pick =
        exercises.find((e: any) => !used.has(String(e.id)) && isLoadedForBurn(e) && fam && famOf(e) === fam) ||
        exercises.find((e: any) => !used.has(String(e.id)) && isLoadedForBurn(e) && fam && FAM_PAT[fam].test(String(e.name || ""))) ||
        exercises.find((e: any) => !used.has(String(e.id)) && isLoadedForBurn(e) && !LIGHT_LIFT.test(String(e.name || "")));
      if (pick) exs[k] = { ...exs[k], name: pick.id };
    }
  }
}

// Guard: the Lift's SECOND item is the "watch-the-room" partner - a SIMPLE, easy-to-coach core /
// carry / single-joint accessory. It must NOT be a mobility/warm-up drill, NOT a heavy compound,
// and must NOT repeat the compound's pattern. (This is why "BB Anterior Shoulder Sheer" - a barbell
// MOBILITY drill that passes the loaded check - must still be swapped out here.) Prefer a loaded
// partner; rotate by day so partners vary across the week.
const MOBILITY_TAGS = /warm ?up|mobility|activation|fire ?up/i;
const SIMPLE_PARTNER_TAGS = /core|carries|accessory/i;
function isMobilityMove(e: any): boolean {
  if (!e) return false;
  const catg = String(e.categories || e.category || "");
  return mtOf(e).some((t: string) => MOBILITY_TAGS.test(t)) || /mobility/i.test(catg);
}
function isSimplePartner(e: any): boolean {
  if (!e || isMobilityMove(e)) return false;
  if (HEAVY_LIFT.test(String(e.name || ""))) return false;               // not another big compound
  return mtOf(e).some((t: string) => SIMPLE_PARTNER_TAGS.test(t));        // core / carry / accessory
}
function guardLiftPartner(cell: any, exercises: any[]) {
  const exById = new Map<string, any>(exercises.map((e: any) => [String(e.id), e]));
  const exs = cell.exercises || [];
  const li = exs.findIndex((e: any) => e.isSection && /^lift$/i.test(String(e.name || "")));
  if (li === -1) return;
  const ci = exs.findIndex((e: any, k: number) => k > li && !e.isSection);   // compound
  if (ci === -1) return;
  const pi = exs.findIndex((e: any, k: number) => k > ci && !e.isSection);   // partner (2nd item)
  if (pi === -1) return;
  const compFam = famOf(exById.get(String(exs[ci].name)));
  const cur = exById.get(String(exs[pi].name));
  if (cur && isSimplePartner(cur) && famOf(cur) !== compFam) return;        // already a good partner
  const used = new Set(exs.filter((x: any) => !x.isSection).map((x: any) => String(x.name)));
  const cands = exercises.filter((e: any) => !used.has(String(e.id)) && isSimplePartner(e) && famOf(e) !== compFam);
  if (!cands.length) return;
  const loaded = cands.filter((e: any) => isLoadedForBurn(e));
  const pool = loaded.length ? loaded : cands;                             // prefer loaded, else a core hold
  const pick = pool[((((cell.day || 1) - 1) % pool.length) + pool.length) % pool.length];  // rotate by day for variety
  exs[pi] = { ...exs[pi], name: pick.id };
}

// Indexes of the strength items inside the Burn 1 / Burn 2 blocks of one session.
function burnItemIdxs(exs: any[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < exs.length; i++) {
    if (!(exs[i].isSection && /^burn\s*[12]$/i.test(String(exs[i].name || "")))) continue;
    for (let k = i + 1; k < exs.length && !exs[k].isSection; k++) out.push(k);
  }
  return out;
}
// All Burn exercise ids used across a set of already-built day cells (for seeding cross-day dedupe).
function burnItemIds(cells: any[]): string[] {
  const ids: string[] = [];
  for (const c of cells || []) for (const k of burnItemIdxs(c.exercises || [])) ids.push(String((c.exercises[k] || {}).name));
  return ids;
}
// Vary the Burn strength partners ACROSS the week's days: if a pattern-based Burn move (knee/hip/
// push/pull) already appeared on an earlier day, swap it for an UNUSED loaded move of the same
// family - so e.g. the hinge partner isn't "Dumbbell Glute Bridge" every single day. Core/carry/
// accessory items (no movement family) are left to their own rotation.
function dedupeBurnsAcrossWeek(cells: any[], exercises: any[], seedUsed?: string[]) {
  const exById = new Map<string, any>(exercises.map((e: any) => [String(e.id), e]));
  const keyOf = (id: string) => moveKey(exById.get(String(id))?.name || "");
  const used = new Set<string>((seedUsed || []).map(keyOf).filter(Boolean));  // dedupe by MOVEMENT, not id
  const ordered = [...cells].sort((a, b) => (a.day || 0) - (b.day || 0));
  for (const cell of ordered) {
    const exs = cell.exercises || [];
    const sessionKeys = new Set<string>(exs.filter((x: any) => !x.isSection).map((x: any) => keyOf(String(x.name))));
    for (const k of burnItemIdxs(exs)) {
      const cur = exById.get(String(exs[k].name));
      const fam = famOf(cur);
      if (!fam) continue;                            // core/carry/accessory partner - not our concern here
      const key = moveKey(cur?.name || "");
      if (!used.has(key)) { used.add(key); continue; } // first appearance of this MOVEMENT this week - keep
      const pick = exercises.find((e: any) => {
        const mk = moveKey(e.name);
        if (used.has(mk) || sessionKeys.has(mk)) return false;
        return isLoadedForBurn(e) && !isMobilityMove(e) && famOf(e) === fam;
      });
      if (pick) { exs[k] = { ...exs[k], name: pick.id }; used.add(moveKey(pick.name)); sessionKeys.add(moveKey(pick.name)); }
      else used.add(key);
    }
  }
}

// ── Finisher Option A variety: a light "pump & carry" blast, not arms-every-day ─────────────
// Option A pairs TWO complementary accessory/carry moves from DIFFERENT areas (shoulders / biceps /
// triceps / upper-back / carry). This guard keeps the two items in different areas within the pair
// AND rotates them across the week, so it stops defaulting to biceps+triceps every day.
function finisherAreaOf(e: any): string | null {
  const n = String(e?.name || "").toLowerCase();
  if (/carry|carries|farmer|suitcase|waiter|front[- ]rack/.test(n)) return "carry";
  if (/face ?pull|pull ?apart|\brows?\b|rear ?delt/.test(n)) return "back";
  if (/lateral raise|front raise|upright row|\bdelt\b|arnold|plate raise|shoulder press|lat raise/.test(n)) return "delts";
  if (/pushdown|push down|tricep|skull|kickback|\bdips?\b|overhead extension/.test(n)) return "triceps";
  if (/curl/.test(n)) return "biceps";
  if (mtOf(e).some((t: string) => /carries/i.test(t))) return "carry";
  return null;
}
const isFinisherAccessory = (e: any) =>
  !!e && (isAccessoryMove(e) || mtOf(e).some((t: string) => /carries/i.test(t)) || finisherAreaOf(e) !== null);
function finisherOptionAIdxs(exs: any[]): number[] {
  const i = exs.findIndex((e: any) => e.isSection && /^finisher$/i.test(String(e.name || "")));
  if (i === -1) return [];
  const items: number[] = [];
  for (let k = i + 1; k < exs.length && !exs[k].isSection; k++) items.push(k);
  const tagged = items.filter((k) => /^\s*option a/i.test(String(exs[k].staffNotes || "")));
  return tagged.length ? tagged : items.slice(0, 2);   // fall back to the first pair
}
// Option A exercise ids already used across a set of built day cells (for seeding cross-day dedupe).
function finisherOptionAIds(cells: any[]): string[] {
  const ids: string[] = [];
  for (const c of cells || []) for (const k of finisherOptionAIdxs(c.exercises || [])) ids.push(String((c.exercises[k] || {}).name));
  return ids;
}
function dedupeFinisherAcrossWeek(cells: any[], exercises: any[], seedUsed?: string[]) {
  const exById = new Map<string, any>(exercises.map((e: any) => [String(e.id), e]));
  const used = new Set<string>(seedUsed || []);
  const ordered = [...cells].sort((a, b) => (a.day || 0) - (b.day || 0));
  for (const cell of ordered) {
    const exs = cell.exercises || [];
    const sessionIds = new Set<string>(exs.filter((x: any) => !x.isSection).map((x: any) => String(x.name)));
    const pairAreas = new Set<string>();
    for (const k of finisherOptionAIdxs(exs)) {
      const cur = exById.get(String(exs[k].name));
      if (!isFinisherAccessory(cur)) continue;         // not an accessory/carry - leave it
      const area = finisherAreaOf(cur);
      const dupId = used.has(String(exs[k].name));
      const dupArea = !!area && pairAreas.has(area);
      if (!dupId && !dupArea) { used.add(String(exs[k].name)); if (area) pairAreas.add(area); continue; }
      const pick = exercises.find((e: any) => {
        const eid = String(e.id);
        if (used.has(eid) || sessionIds.has(eid)) return false;
        if (!isFinisherAccessory(e)) return false;
        const a = finisherAreaOf(e);
        return a ? !pairAreas.has(a) : true;           // prefer a DIFFERENT area from the pair
      });
      if (pick) {
        exs[k] = { ...exs[k], name: pick.id };
        used.add(String(pick.id)); sessionIds.add(String(pick.id));
        const a = finisherAreaOf(pick); if (a) pairAreas.add(a);
      } else { used.add(String(exs[k].name)); if (area) pairAreas.add(area); }
    }
  }
}

// ── Block completeness: never leave a block short ──────────────────────────
// The model occasionally drops an item, or names an id that gets filtered out (a fixed machine,
// a typo) - which would leave e.g. a Burn with a single exercise and force a full regen. Pad any
// short block with a ROLE-APPROPRIATE unused library exercise so every generation is usable.
const isActivationMove = (e: any) => !!e && mtOf(e).some((t: string) => /fire ?up|activation/i.test(t));
const isAccessoryMove = (e: any) => !!e && mtOf(e).some((t: string) => /accessory/i.test(t));
const isConditioningMove = (e: any) =>
  !!e && (mtOf(e).some((t: string) => /conditioning|core|carries/i.test(t)) || REAL_ERG.test(String(e.name || "").trim()));
const BLOCK_MIN: Record<string, number> = { "Fire Up": 2, "Lift": 2, "Burn 1": 2, "Burn 2": 2, "Finisher": 4 };
function candidatesForBlock(name: string): (e: any) => boolean {
  if (name === "Fire Up")  return (e) => isActivationMove(e);
  if (name === "Lift")     return (e) => isSimplePartner(e) && isLoadedForBurn(e);
  if (name === "Burn 1")   return (e) => isLoadedForBurn(e) && (famOf(e) === "push" || famOf(e) === "hip");
  if (name === "Burn 2")   return (e) => isLoadedForBurn(e) && (famOf(e) === "pull" || famOf(e) === "knee");
  if (name === "Finisher") return (e) => isAccessoryMove(e) || isConditioningMove(e);
  return () => false;
}
function guardBlockCounts(cell: any, exercises: any[]) {
  const exs = cell.exercises || [];
  const secs: { i: number; name: string }[] = [];
  for (let i = 0; i < exs.length; i++) if (exs[i].isSection) secs.push({ i, name: String(exs[i].name || "") });
  // walk blocks LAST->FIRST so inserting into one block doesn't shift the blocks we haven't processed
  for (let s = secs.length - 1; s >= 0; s--) {
    const { i, name } = secs[s];
    const min = BLOCK_MIN[name];
    if (!min) continue;
    const end = s + 1 < secs.length ? secs[s + 1].i : exs.length;
    let count = 0;
    for (let k = i + 1; k < end; k++) if (!exs[k].isSection) count++;
    let need = min - count;
    if (need <= 0) continue;
    const used = new Set(exs.filter((x: any) => !x.isSection).map((x: any) => String(x.name)));
    const wants = candidatesForBlock(name);
    const pool = exercises.filter((e: any) => !used.has(String(e.id)) && wants(e));
    while (need-- > 0 && pool.length) {
      const pick = pool.shift();
      used.add(String(pick.id));
      const item = normalizeItem({
        blockType: name, name: pick.id, sets: SETS_DEFAULT[name] ?? 3, reps: REP_DEFAULT[name] ?? 10,
        weight: 0, distance: 0, timeMins: 0, timeSecs: 0, rest: 60, linkedToNext: false, eachSide: false, staffNotes: "",
      });
      exs.splice(end, 0, item);
    }
  }
}

// Guard: keep prescriptions on the right metric. Only CARRIES (distance/time), ERGS (calories/time)
// and HOLDS/isometrics (time) may use distance or time. Everything else - curls, raises, presses,
// rows, squats, etc. - must be REP-based. If a rep move arrived with a distance/time prescription
// (e.g. "Long Bar Curl - 30m"), convert it to reps and clear the distance/time so the app shows reps.
const CARRY_RE = /carry|carries|farmer|suitcase|waiter|yoke|\bsled\b|prowler|loaded march/i;
const ERG_RE = /\berg\b|air ?bike|assault bike|echo bike|\bbike\b|\brower\b|\browing\b|ski ?erg|treadmill|\brun\b|\bjog\b|sprint|stair ?master|stairmaster/i;
const HOLD_RE = /plank|\bhold\b|\bhang\b|wall ?sit|hollow|dead ?bug|isometric|\biso\b|bear crawl|superman|bird ?dog|\bl-?sit\b|flutter/i;
function metricIsTimeOrDistance(e: any): boolean {
  const n = String(e?.name || "");
  return CARRY_RE.test(n) || ERG_RE.test(n) || HOLD_RE.test(n);
}
function guardPrescriptions(cell: any, exercises: any[]) {
  const exById = new Map<string, any>(exercises.map((e: any) => [String(e.id), e]));
  for (const it of cell.exercises || []) {
    if (it.isSection) continue;
    const ex = exById.get(String(it.name));
    if (!ex || metricIsTimeOrDistance(ex)) continue;   // carries/ergs/holds legitimately use time/distance
    const repsStr = String(it.reps ?? "").trim();
    const hasReps = /^\d+$/.test(repsStr) ? Number(repsStr) > 0 : /^\d+\s*\/\s*\d+$/.test(repsStr);
    const hasTime = (Number(it.timeMins) || 0) + (Number(it.timeSecs) || 0) > 0;
    const hasDist = (Number(it.distance) || 0) > 0;
    if (hasTime || hasDist || !hasReps) {
      if (!hasReps) it.reps = REP_DEFAULT[it.blockType] ?? 12;   // give it a real rep target
      it.distance = 0; it.timeMins = 0; it.timeSecs = 0;         // strip the wrong metric
    }
  }
}

function buildSystem(exListStr: string) {
  return [
    { type: "text", text: SYSTEM_PROMPT },
    {
      type: "text",
      text: `EXERCISE LIBRARY (use ONLY these ids):\n${exListStr}`,
      cache_control: { type: "ephemeral" },
    },
  ];
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
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
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
      try {
        return extractJson(block.text);
      } catch (parseErr) {
        if (attempt < 3) { await sleep(1000); continue; }
        throw parseErr;
      }
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

// ── Progression stamping (deterministic) ─────────────────────────────────
// round 1 = weeks 1-4 (base, unchanged); round 2 = weeks 5-8; round 3 = weeks 9-12.
const roundOf = (week: number) => Math.floor((week - 1) / CYCLE) + 1;      // 1 | 2 | 3
const baseWeekOf = (week: number) => ((week - 1) % CYCLE) + 1;             // 1 | 2 | 3 | 4

// Only rep-based items get their reps waved. Timed / distance / calorie work is left as authored.
function isRepBased(it: any): boolean {
  const t = (Number(it.timeMins) || 0) + (Number(it.timeSecs) || 0);
  const d = Number(it.distance) || 0;
  if (t > 0 || d > 0) return false;
  const s = String(it.reps ?? "").trim();
  return /^\d+$/.test(s) ? Number(s) > 0 : /^\d+\s*\/\s*\d+$/.test(s);
}

// Set reps to an ABSOLUTE target (compound lift), respecting per-side format.
function setReps(baseReps: any, target: number): any {
  const s = String(baseReps ?? "").trim();
  if (/^\d+$/.test(s)) return target;
  if (/^(\d+)\s*\/\s*(\d+)$/.test(s)) return `${target}/${target}`;
  return baseReps;
}

// Reduce reps DOWN by `delta` (never below `floor`), respecting per-side format.
function reduceReps(baseReps: any, delta: number, floor: number): any {
  const s = String(baseReps ?? "").trim();
  if (/^\d+$/.test(s)) return Math.max(parseInt(s, 10) - delta, floor);
  const m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) { const t = Math.max(parseInt(m[1], 10) - delta, floor); return `${t}/${t}`; }
  return baseReps;
}

const addCue = (it: any, cue: string) =>
  (it.staffNotes = `${it.staffNotes ? it.staffNotes + " · " : ""}${cue}`);

// Safety net: guarantee every exercise has sets>=1 and a real prescription (reps / time /
// distance). If the model left one blank, backfill a sensible rep default for its block.
const REP_DEFAULT: Record<string, number> = {
  "Warm Up": 10, "Fire Up": 12, "Lift": 8, "Burn 1": 10, "Burn 2": 10, "Finisher": 12,
};
const SETS_DEFAULT: Record<string, number> = {
  "Warm Up": 1, "Fire Up": 2, "Lift": 4, "Burn 1": 3, "Burn 2": 3, "Finisher": 3,
};
function normalizeItem(it: any): any {
  if (it.isSection) return it;
  const out = { ...it };
  if (!(Number(out.sets) > 0)) out.sets = SETS_DEFAULT[out.blockType] ?? 3;
  const repsStr = String(out.reps ?? "").trim();
  const hasReps = /^\d+$/.test(repsStr) ? Number(repsStr) > 0 : /^\d+\s*\/\s*\d+$/.test(repsStr);
  const t = (Number(out.timeMins) || 0) + (Number(out.timeSecs) || 0);
  const d = Number(out.distance) || 0;
  if (!hasReps && t === 0 && d === 0) out.reps = REP_DEFAULT[out.blockType] ?? 10;
  return out;
}
const normalizeItems = (items: any[]) => items.map(normalizeItem);

// Transform a base session's items for round 2 or 3.
function transformItems(items: any[], round: number): any[] {
  if (round === 1) return items.map((it) => ({ ...it }));
  let seenCompound = false;
  return items.map((it) => {
    if (it.isSection) return { ...it };
    const out = { ...it };
    const bt = out.blockType;

    if (bt === "Lift" && !seenCompound) {
      // the compound lift: drive heavy to an ABSOLUTE low-rep target (only if rep-based)
      seenCompound = true;
      if (isRepBased(out)) {
        if (round === 2) { out.sets = 4; out.reps = setReps(out.reps, 6); }
        else { out.sets = 5; out.reps = setReps(out.reps, 5); }
      }
      addCue(out, `Round ${round}: heavier, aim ${round === 2 ? "6" : "4-5"} reps`);
    } else if (bt === "Burn 1" || bt === "Burn 2") {
      // strength supersets: rep-based work waves DOWN; timed/calorie left as-is
      if (isRepBased(out)) out.reps = round === 2 ? reduceReps(out.reps, 2, 8) : reduceReps(out.reps, 4, 6);
      addCue(out, `Round ${round}: add load`);
    } else if (bt === "Finisher") {
      // accessory + conditioning: leave the prescription, progress by effort/load
      addCue(out, `Round ${round}: increase load/effort`);
    }
    // Warm Up, Fire Up, and the Lift core partner: unchanged
    return out;
  });
}

// From one base session (template week 1-4, day d) produce its 3 rounds at weeks b, b+4, b+8.
function stampSession(base: any): any[] {
  const b = baseWeekOf(base.week);
  return [1, 2, 3].map((round) => ({
    week: b + (round - 1) * CYCLE,
    day: base.day,
    exercises: transformItems(base.exercises, round),
  }));
}

// Guard: the Warm Up's first (cardio) slot must be a REAL erg machine - not a conditioning move
// that merely contains "rower" etc. (e.g. "Burpee Over Rower"). Varies the machine by day.
const REAL_ERG = /^(bike erg|ski[ -]?erg|rower|air bike|assault bike|echo bike|treadmill run|treadmill|curved treadmill|stairmaster)$/i;
function guardWarmupCardio(cell: any, exercises: any[]) {
  const exById = new Map<string, any>(exercises.map((e: any) => [String(e.id), e]));
  const exs = cell.exercises || [];
  const i = exs.findIndex((e: any) => e.isSection && /warm ?up/i.test(String(e.name || "")));
  if (i === -1) return;
  const ci = exs.findIndex((e: any, k: number) => k > i && !e.isSection);
  if (ci === -1) return;
  const cur = exById.get(String(exs[ci].name));
  const isMachine = cur && REAL_ERG.test(String(cur.name || "").trim());
  const isCardioSlot = (Number(exs[ci].timeMins) || 0) >= 2 || (cur && /erg|bike|rower|ski|treadmill|burpee/i.test(String(cur.name || "")));
  if (isMachine || !isCardioSlot) return; // already a real machine, or not the cardio slot
  const ergs = exercises.filter((e: any) => REAL_ERG.test(String(e.name || "").trim()));
  if (!ergs.length) return;
  const pick = ergs[(((cell.day || 1) - 1) % ergs.length + ergs.length) % ergs.length];
  exs[ci] = { ...exs[ci], name: pick.id };
}

// Build the cross-block memory instruction from the previous block's exercise NAMES.
function memoryContext(keepThemes: string[], avoid: string[]): string {
  if (!keepThemes.length && !avoid.length) return "";
  return `\n\nCROSS-BLOCK MEMORY (this block follows a previous 12-week block - keep the big lifts as themes, freshen the rest):\n- Main compound lifts from last block - you MAY reuse these movements so clients keep progressing the big lifts: ${keepThemes.join(", ") || "(none)"}.\n- Everything else used last block - do NOT reuse these; pick DIFFERENT exercises for warm-ups, fire-ups, the Lift core partner, Burn 1/2 and finishers. Keep the SAME movement patterns, just choose different exercises: ${avoid.join(", ") || "(none)"}.`;
}

// Ask Claude for ALL the distinct days of one template week (cw = 1..4).
async function generateTemplateWeek(
  apiKey: string, system: any[], cw: number, days: number, priorWeeks: any[],
  keepThemes: string[] = [], avoid: string[] = [],
): Promise<any[]> {
  const dayList = Array.from({ length: days }, (_, i) => i + 1).join(", ");
  const ctx = priorWeeks.length
    ? `\n\nEARLIER TEMPLATE WEEKS in this block (make THIS week's sessions different from these - rotate exercises so the block doesn't get repetitive):\n${JSON.stringify(priorWeeks.map((w) => ({ week: w.week, day: w.day, exercises: w.exercises })))}`
    : "";
  const prompt = `Group PT block, TEMPLATE WEEK ${cw}. Build ${days} sessions - one for EACH day (days ${dayList}) - all in this same week. The days must be DISTINCT from each other (different exercises and emphasis) and spread the movement patterns across the week (rotate the Lift's heavy pattern - squat / hinge / press / row). Each day follows the full skeleton (Warm Up -> Fire Up -> Lift -> Burn 1 -> Burn 2 -> Finisher) with complementary superset pairing. Do NOT progress across weeks - that is added later.${ctx}${memoryContext(keepThemes, avoid)}

Return ONLY a JSON object, no markdown, no text outside it:
{ "workouts": [ { "week": ${cw}, "day": 1, "exercises": [ <items> ] }, { "week": ${cw}, "day": 2, "exercises": [ ... ] }${days > 2 ? ", … one object per day up to day " + days : ""} ] }
${ITEM_SHAPES}`;
  const parsed = await callClaude(apiKey, system, prompt, true); // think = true (plan distinct, balanced days)
  return parsed.workouts || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action, program, currentWorkouts = [], exercises, targetWorkoutIndex } = body;
    const days = program?.days ?? 5;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set in Edge Function secrets.");

    // PT-area filter: drop fixed resistance machines (keep cables, free weights, bands, bodyweight, cardio ergs).
    const allowed = (exercises as any[]).filter(equipmentAllowed);
    const enrich = await fetchEnrichment(); // tier/cns/prep tags (best-effort)
    const system = buildSystem(buildExerciseList(allowed, enrich));
    const validIds = new Set(allowed.map((e: any) => String(e.id)));

    // Cross-block memory: from the previous block's grid, split exercises into the main compound
    // lifts (keep as themes) and everything else (rotate away from). Names come from the library.
    const nameById = new Map<string, string>(allowed.map((e: any) => [String(e.id), e.name]));
    let keepThemes: string[] = [];
    let avoidList: string[] = [];
    if (Array.isArray(body.previousBlockWorkouts) && body.previousBlockWorkouts.length) {
      const keepIds = new Set<string>();
      const avoidIds = new Set<string>();
      for (const cell of body.previousBlockWorkouts) {
        let seenLift = false;
        for (const it of (cell.exercises || [])) {
          if (it.isSection) continue;
          const id = String(it.name);
          if (it.blockType === "Lift" && !seenLift) { seenLift = true; keepIds.add(id); }
          else avoidIds.add(id);
        }
      }
      const toName = (id: string) => nameById.get(id);
      keepThemes = [...keepIds].map(toName).filter(Boolean) as string[];
      avoidList = [...avoidIds].map(toName).filter(Boolean) as string[];
    }
    const clean = (items: any[]) =>
      items
        .filter((e: any) => e.isSection || validIds.has(String(e.name)))
        .map((e: any) => ({ ...normalizeItem(e), id: Date.now() + Math.random() }));

    const updated = [...currentWorkouts];
    const mergeCell = (cell: any) => {
      const cleaned = clean(cell.exercises);
      const idx = updated.findIndex((w) => w.week === cell.week && w.day === cell.day);
      if (idx !== -1) updated[idx].exercises = cleaned;
      else updated.push({ week: cell.week, day: cell.day, exercises: cleaned });
    };
    // Run every selection guard on one base cell (shared by week/day/single paths).
    const applyGuards = (baseCell: any) => {
      guardLiftCompound(baseCell, allowed, enrich);
      guardWarmupCardio(baseCell, allowed);   // warm-up cardio slot must be a real erg, not a burpee
      guardBurn1PushHinge(baseCell, allowed); // Burn 1 = upper push + lower hinge (not two pushes)
      guardBurn2Pull(baseCell, allowed);      // Burn 2 must carry a real upper pull, not core
      guardLoadedLiftBurn(baseCell, allowed); // Lift/Burn = loaded only (bar pull-ups/ring rows)
      guardLiftPartner(baseCell, allowed);    // Lift's 2nd item = simple coachable partner
      guardBlockCounts(baseCell, allowed);    // pad any block a dropped/invalid id left short
      guardPrescriptions(baseCell, allowed);  // reps for rep-moves; time/distance only for carries/ergs/holds
    };

    if (action === "week") {
      // Generate all distinct days for this template week, then stamp each across its 3 rounds.
      // stampRounds:false = TEST MODE - build just this one week (one AI call, no round stamping).
      const cw = body.cycleWeek; // 1..4
      const stampRounds = body.stampRounds !== false;
      const priorWeeks = currentWorkouts.filter((w: any) => w.week < cw && w.week <= CYCLE);
      const sessions = await generateTemplateWeek(apiKey, system, cw, days, priorWeeks, keepThemes, avoidList);
      const baseCells = sessions.map((base: any) => {
        // clean (drop invalid ids) + normalize BEFORE guards, so guards act on valid items only
        const baseCell = { week: cw, day: base.day, exercises: clean(base.exercises) };
        applyGuards(baseCell);
        return baseCell;
      });
      dedupeBurnsAcrossWeek(baseCells, allowed); // vary Burn exercises day-to-day (no same hinge/knee every day)
      dedupeFinisherAcrossWeek(baseCells, allowed); // Finisher Option A: vary the pump/carry, not arms every day
      for (const bc of baseCells) { const others = baseCells.filter((x: any) => x !== bc); guardLiftPressVariety(bc, allowed, others, cw); guardBurn1PressAngle(bc, allowed, others, cw); } // rotate press angle across the week (Lift + Burn 1)
      for (const baseCell of baseCells) {
        if (stampRounds) for (const cell of stampSession(baseCell)) mergeCell(cell);
        else mergeCell(baseCell);               // test week: just this week's days, no rounds
      }

    } else if (action === "day") {
      // Build ONE day of a template week (fast, safely under the edge time limit). The client loops
      // days to make a week - each call returns quickly and can't time out or truncate.
      const cw = body.cycleWeek ?? 1;
      const d = body.day ?? 1;
      const stampRounds = body.stampRounds !== false;
      const sameWeekDays = currentWorkouts.filter((w: any) => baseWeekOf(w.week) === cw && w.day !== d);
      const ctx = sameWeekDays.length
        ? `\n\nOTHER DAYS ALREADY BUILT THIS WEEK (make THIS day DISTINCT - different Lift pattern and exercises, spread the patterns across the week):\n${JSON.stringify(sameWeekDays.map((w: any) => ({ day: w.day, exercises: w.exercises })))}`
        : "";
      const prompt = `Group PT block, template week ${cw}, Day ${d}. Build ONE complete session following the full skeleton (Warm Up -> Fire Up -> Lift -> Burn 1 -> Burn 2 -> Finisher) with complementary superset pairing. Prescribe with the tracking fields (timeSecs for holds, distance for carries, reps as calories for machines). Do NOT progress across weeks - progression is added later.${ctx}${memoryContext(keepThemes, avoidList)}

Return ONLY JSON, no markdown:
{ "workouts": [ { "week": ${cw}, "day": ${d}, "exercises": [ <items> ] } ] }
${ITEM_SHAPES}`;
      const parsed = await callClaude(apiKey, system, prompt, true); // one day -> fast, no timeout
      const gw = parsed.workouts?.[0];
      if (gw) {
        const baseCell = { week: cw, day: d, exercises: clean(gw.exercises) };
        applyGuards(baseCell);
        dedupeBurnsAcrossWeek([baseCell], allowed, burnItemIds(sameWeekDays)); // vary vs the week's other days
        dedupeFinisherAcrossWeek([baseCell], allowed, finisherOptionAIds(sameWeekDays)); // vary Option A vs other days
        guardLiftPressVariety(baseCell, allowed, sameWeekDays, cw); // rotate press angle vs the week's other press days
        guardBurn1PressAngle(baseCell, allowed, sameWeekDays, cw);  // rotate Burn 1's push angle too (not always chest)
        if (stampRounds) for (const cell of stampSession(baseCell)) mergeCell(cell);
        else mergeCell(baseCell);
      }

    } else if (action === "single") {
      // Regenerate ONE session. Map its week back to the template week (1-4), rebuild just that
      // day (kept distinct from the week's other days), and re-stamp its three rounds.
      const t = currentWorkouts[targetWorkoutIndex] ?? { week: body.week ?? 1, day: body.day ?? 1 };
      const cw = baseWeekOf(t.week);
      const otherDays = currentWorkouts.filter((w: any) => w.week === cw && w.day !== t.day);
      const ctx = otherDays.length
        ? `\n\nOTHER DAYS THIS WEEK (keep this session DIFFERENT from them and spread patterns across the week):\n${JSON.stringify(otherDays.map((w: any) => ({ day: w.day, exercises: w.exercises })))}`
        : "";
      const prompt = `Group PT block, template week ${cw}, Day ${t.day}. Rebuild this ONE session following the full skeleton (Warm Up -> Fire Up -> Lift -> Burn 1 -> Burn 2 -> Finisher) with complementary superset pairing. Prescribe with the tracking fields (timeSecs for holds, distance for carries, reps as calories for machines). Do NOT progress across weeks - progression is added later.${ctx}${memoryContext(keepThemes, avoidList)}

Return ONLY JSON, no markdown:
{ "workouts": [ { "week": ${cw}, "day": ${t.day}, "exercises": [ <items> ] } ] }
${ITEM_SHAPES}`;
      const parsed = await callClaude(apiKey, system, prompt, true);
      const gw = parsed.workouts?.[0];
      if (gw) {
        const baseCell = { week: cw, day: t.day, exercises: clean(gw.exercises) };
        applyGuards(baseCell);
        dedupeBurnsAcrossWeek([baseCell], allowed, burnItemIds(otherDays)); // don't reuse the other days' Burn moves
        dedupeFinisherAcrossWeek([baseCell], allowed, finisherOptionAIds(otherDays)); // vary Option A vs other days
        guardLiftPressVariety(baseCell, allowed, otherDays, cw); // rotate press angle vs the week's other press days
        guardBurn1PressAngle(baseCell, allowed, otherDays, cw);  // rotate Burn 1's push angle too (not always chest)
        for (const cell of stampSession(baseCell)) mergeCell(cell);
      }

    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    // ── FINAL SAFETY NET ──────────────────────────────────────────────────
    // Sweep the ENTIRE returned grid and guarantee no cell has a non-compound Lift, whatever
    // slipped through per-day or arrived as stale currentWorkouts. Keep the 3 rounds consistent:
    // decide the swap once per (baseWeek,day) and apply the same Lift id across weeks, +4, +8.
    const liftIdx = (exs: any[]) => {
      const li = exs.findIndex((e: any) => e.isSection && /^lift$/i.test(String(e.name || "")));
      return li === -1 ? -1 : exs.findIndex((e: any, k: number) => k > li && !e.isSection);
    };
    const groups = new Map<string, any[]>();
    for (const cell of updated) {
      const key = `${baseWeekOf(cell.week)}-${cell.day}`;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(cell);
    }
    for (const group of groups.values()) {
      const first = group[0];
      const ci0 = liftIdx(first.exercises || []);
      if (ci0 === -1) continue;
      const before = String(first.exercises[ci0].name);
      guardLiftCompound(first, allowed, enrich);       // swaps if the Lift isn't a real compound
      const after = String(first.exercises[liftIdx(first.exercises)].name);
      if (after !== before) {
        for (const cell of group) {                    // propagate the same Lift id to every round
          const ci = liftIdx(cell.exercises || []);
          if (ci !== -1) cell.exercises[ci] = { ...cell.exercises[ci], name: after };
        }
      }
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
