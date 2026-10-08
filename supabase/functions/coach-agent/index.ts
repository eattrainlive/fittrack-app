// Supabase Edge Function: coach-agent
// A conversational programming agent for the COACH side. Reasons with the exercise
// library as tools (search / alternates / variety / save / learn a preference), guided by
// the stream recipe + accumulated coaching preferences + member context.
//
// POST body: { chatId?, message, stream, draft?, memberId? }
// Returns:   { chatId, assistant, draft }
//
// Uses Claude (same provider + key as the existing generator). No OpenAI needed.
// Env (Supabase secrets): ANTHROPIC_API_KEY (already set). SUPABASE_URL + SERVICE_ROLE_KEY auto-provided.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 16000;
const ANTHROPIC = "https://api.anthropic.com/v1/messages";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const jsonResp = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

// ---- Tool implementations (run against the DB) -----------------------------
async function searchExercises(a: any) {
  let q = sb.from("exercises")
    .select("id,name,movement_pattern,movement_family,equipment,difficulty,unilateral,is_compound,role,contraindications")
    .limit(a.limit ?? 12);
  if (a.movement_pattern) q = q.eq("movement_pattern", a.movement_pattern);
  if (a.role) q = q.eq("role", a.role);
  if (a.difficulty) q = q.eq("difficulty", a.difficulty);
  if (a.equipment) q = q.in("equipment", Array.isArray(a.equipment) ? a.equipment : [a.equipment]);
  if (Array.isArray(a.exclude_ids) && a.exclude_ids.length) q = q.not("id", "in", `(${a.exclude_ids.map((x: string) => `"${x}"`).join(",")})`);
  let { data } = await q;
  data = data || [];
  const exFam = new Set((a.exclude_families || []).map((s: string) => s.toLowerCase()));
  const injuries = (a.member_injuries || []).map((s: string) => s.toLowerCase());
  return data.filter((e: any) =>
    !exFam.has((e.movement_family || "").toLowerCase()) &&
    !(e.contraindications || []).some((c: string) => injuries.includes((c || "").toLowerCase())),
  ).slice(0, a.limit ?? 8);
}

async function getAlternates(a: any) {
  const { data: ex } = await sb.from("exercises").select("*").eq("id", a.exercise_id).maybeSingle();
  if (!ex) return { error: "exercise not found" };
  const cands = await searchExercises({
    movement_pattern: ex.movement_pattern,
    equipment: a.equipment,
    exclude_ids: [ex.id, ...(a.exclude_ids || [])],
    exclude_families: a.exclude_families || [],
    member_injuries: a.member_injuries || [],
    difficulty: a.match_difficulty ? ex.difficulty : undefined,
    limit: a.limit ?? 8,
  });
  const curated = new Set((ex.alternates ? String(ex.alternates).split(/[;,]/) : []).map((s) => s.trim().toLowerCase()));
  cands.sort((x: any, y: any) => (curated.has(y.name.toLowerCase()) ? 1 : 0) - (curated.has(x.name.toLowerCase()) ? 1 : 0));
  return cands.map((c: any) => ({ id: c.id, name: c.name, pattern: c.movement_pattern, family: c.movement_family, equipment: c.equipment }));
}

async function checkVariety(a: any) {
  const draft = a.draft || {};
  const { data: cap } = await sb.from("feature_settings").select("value").eq("key", "variety_caps").maybeSingle();
  const caps = (cap?.value as any) || { maxPerFamilyPerWeek: { default: 3 }, maxSameIsolationPerSession: 1 };
  const famCount: Record<string, number> = {};
  const issues: string[] = [];
  for (const wk of draft.weeks || []) {
    for (const day of wk.days || []) {
      const isoByPattern: Record<string, number> = {};
      for (const sec of day.sections || []) {
        for (const ex of sec.exercises || []) {
          const fam = (ex.movement_family || ex.family || "").toLowerCase();
          if (fam) famCount[fam] = (famCount[fam] || 0) + 1;
          const p = (ex.movement_pattern || ex.pattern || "");
          if (p.startsWith("isolation")) isoByPattern[p] = (isoByPattern[p] || 0) + 1;
        }
      }
      for (const [p, n] of Object.entries(isoByPattern))
        if (n > (caps.maxSameIsolationPerSession ?? 1)) issues.push(`${day.day || "A day"}: ${n} ${p} isolations in one session.`);
    }
  }
  for (const [fam, n] of Object.entries(famCount)) {
    const capN = caps.maxPerFamilyPerWeek?.[fam] ?? caps.maxPerFamilyPerWeek?.default ?? 3;
    if (n > capN) issues.push(`${fam} used ${n}x this week (cap ${capN}).`);
  }
  return { ok: issues.length === 0, issues };
}

async function addPreference(a: any) {
  await sb.from("coaching_preferences").insert({ scope: a.scope || "global", rule: a.rule, source: "learned" });
  return { saved: true };
}

function saveDraft(a: any, state: any) { state.draft = a.draft; return { saved: true }; }

const TOOLS = [
  { name: "search_exercises", description: "Find real exercises from the library by movement_pattern, equipment, role, difficulty; exclude ids/families and injury-unsafe. Never invent exercises — always pick from here.", input_schema: { type: "object", properties: {
    movement_pattern: { type: "string" }, equipment: { type: "array", items: { type: "string" } }, role: { type: "string" }, difficulty: { type: "string" },
    exclude_ids: { type: "array", items: { type: "string" } }, exclude_families: { type: "array", items: { type: "string" } }, member_injuries: { type: "array", items: { type: "string" } }, limit: { type: "number" } } } },
  { name: "get_alternates", description: "Ranked like-for-like swaps for an exercise (same pattern, safe, not repeated).", input_schema: { type: "object", properties: {
    exercise_id: { type: "string" }, equipment: { type: "array", items: { type: "string" } }, exclude_ids: { type: "array", items: { type: "string" } }, exclude_families: { type: "array", items: { type: "string" } }, member_injuries: { type: "array", items: { type: "string" } }, match_difficulty: { type: "boolean" }, limit: { type: "number" } }, required: ["exercise_id"] } },
  { name: "check_variety", description: "Scan a draft for over-used movement families / doubled isolations vs the caps. Call before finalising a week.", input_schema: { type: "object", properties: { draft: { type: "object" } }, required: ["draft"] } },
  { name: "save_draft", description: "Commit the current structured programme draft (weeks -> days -> sections -> exercises).", input_schema: { type: "object", properties: { draft: { type: "object" } }, required: ["draft"] } },
  { name: "add_preference", description: "Save a coaching rule to remember for future programmes (learn from a coach correction).", input_schema: { type: "object", properties: { scope: { type: "string" }, rule: { type: "string" } }, required: ["rule"] } },
];

async function runTool(name: string, args: any, state: any) {
  switch (name) {
    case "search_exercises": return await searchExercises(args);
    case "get_alternates": return await getAlternates(args);
    case "check_variety": return await checkVariety(args);
    case "add_preference": return await addPreference(args);
    case "save_draft": return saveDraft(args, state);
    default: return { error: "unknown tool" };
  }
}

async function claude(system: string, messages: any[], maxTokens = MAX_TOKENS) {
  const r = await fetch(ANTHROPIC, {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages, thinking: { type: "disabled" } }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${await r.text()}`);
  return await r.json();
}

// ---- Shared: structure ONE written week into editor rows -------------------
const flatText = (c: any): string =>
  typeof c === "string" ? c
    : Array.isArray(c) ? c.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("\n")
    : (c && typeof c.text === "string") ? c.text : "";

function mkRow(p: string[]) {
  const row: any = { isSection: false, blockType: p[1] || "Strength", name: p[2] || "", label: p[3] || "", sets: Number(p[4]) || 0, reps: p[5] || "", rest: Number(p[6]) || 0, eachSide: p[7] === "1", linkedToNext: p[8] === "1", coachingNotes: (p[9] || "").trim() };
  const rr = String(row.reps).trim().toLowerCase();
  let m: RegExpMatchArray | null;
  // Combined "calories in a fixed time window" e.g. "max cals in 30s", "30s max calories",
  // "20 cal in 40 sec" — show the interval (time) AND a calories field to log.
  const secAny = rr.match(/(\d+)\s*(?:sec|secs|second|seconds)\b/) || rr.match(/(\d+)\s*s\b/);
  const minAny = rr.match(/(\d+)\s*(?:min|mins|minute|minutes)\b/);
  const hasCalWord = /\bcal(?:s|orie|ories)?\b/.test(rr);
  if (hasCalWord && (secAny || minAny)) {
    if (secAny) row.timeSecs = Number(secAny[1]);
    if (minAny) row.timeMins = Number(minAny[1]);
    const calNum = rr.match(/(\d+)\s*(?:cal|cals|calorie|calories)\b/);
    row.calories = calNum ? Number(calNum[1]) : "max";   // "max" = log actual, no target
    row.reps = "";
  }
  else if ((m = rr.match(/^(\d+)\s*(?:min|mins|minute|minutes)\b/))) { row.timeMins = Number(m[1]); row.reps = ""; }
  else if ((m = rr.match(/^(\d+)\s*(?:sec|secs|second|seconds|s)\b/))) { row.timeSecs = Number(m[1]); row.reps = ""; }
  else if ((m = rr.match(/^(\d+)\s*(?:cal|cals|calorie|calories)\b/))) { row.calories = Number(m[1]); row.reps = ""; }
  else if ((m = rr.match(/^(\d+)\s*(?:m|metre|metres|meter|meters)\b/))) { row.distance = Number(m[1]); row.reps = ""; }
  // Safety net: if a cardio/mobility piece has NO duration in reps but the cue mentions one
  // (e.g. reps blank, note "3 min easy pulse-raiser"), pull the duration out of the note so
  // the builder/logger always shows the prescribed time. Only for time-type blocks.
  {
    const btEarly = String(row.blockType || "").toLowerCase();
    const timeType = btEarly === "cardio" || btEarly === "mobility" || btEarly === "activation";
    const noNumbersYet = !row.timeMins && !row.timeSecs && !row.distance && !row.calories;
    if (timeType && noNumbersYet) {
      const note = `${row.reps} ${row.coachingNotes || ""}`.toLowerCase();
      const mn = note.match(/(\d+)\s*(?:min|mins|minute|minutes)\b/);
      const sc = note.match(/(\d+)\s*(?:sec|secs|second|seconds)\b/);
      if (mn) { row.timeMins = Number(mn[1]); if (!/\d/.test(String(row.reps))) row.reps = ""; }
      if (sc) { row.timeSecs = Number(sc[1]); if (!/\d/.test(String(row.reps))) row.reps = ""; }
    }
  }
  // Set the tracking type this exercise should log, from what was actually prescribed + its block.
  // The app uses this (per-exercise, coach-editable) rather than a rigid library tag.
  const bt = String(row.blockType || "").toLowerCase();
  const lbl = String(row.label || "").toLowerCase();
  const isCarry = /carry|carries|farmer|suitcase|yoke|sled|march/.test(lbl);
  const t: string[] = [];
  if (row.distance) {
    // loaded carries (farmers walk, sled, suitcase march) log weight + distance;
    // cardio-distance (rowing/running for metres) logs distance + time.
    t.push(isCarry || (bt !== "cardio" && bt !== "mobility") ? "Weight & Distance" : "Distance & Time");
  }
  const hasTime = !!(row.timeMins || row.timeSecs);
  // "max cals in 30s" style: a fixed work interval to DISPLAY + calories to LOG.
  if (row.calories && hasTime) t.push("Calories & Time");
  else if (row.calories) t.push("Calories");
  if (hasTime && !row.distance && !row.calories) t.push("Time Only");
  if (String(row.reps).trim()) t.push(bt === "cardio" || bt === "mobility" || bt === "activation" ? "Reps Only" : "Weight & Reps");
  if (!t.length) t.push(bt === "cardio" ? "Time Only" : bt === "mobility" ? "Time Only" : "Weight & Reps");
  row.trackingType = [...new Set(t)];
  return row;
}
function parseDays(raw: string) {
  const days: any[] = []; let cd: any = null;
  for (const ln of raw.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean)) {
    const p = ln.split("|"); const t = p[0];
    if (t === "D") { cd = { day: p[1] || "Day", minDays: parseInt(p[2]) || 2, rows: [] }; days.push(cd); }
    else if (t === "S" && cd) {
      // Freestyle conditioning carries the whole workout as text; "\n" (literal) marks line breaks.
      const desc = (p[3] || "").replace(/\\n/g, "\n");
      cd.rows.push({ isSection: true, sectionType: p[1] || "Normal", name: p[2] || "", description: desc });
    }
    else if (t === "E" && cd) {
      const row = mkRow(p);
      // Exercises under a Freestyle section are REFERENCE-ONLY (video links, no logging).
      if (cd.rows.length) {
        for (let i = cd.rows.length - 1; i >= 0; i--) {
          if (cd.rows[i].isSection) { if (cd.rows[i].sectionType === "Freestyle") row.reference = true; break; }
        }
      }
      cd.rows.push(row);
    }
  }
  return days;
}
const weekSysFor = (idName: string) =>
  "Convert ONE written training week into COMPACT PIPE-DELIMITED lines. Output ONLY these lines — no JSON, no markdown, no code fences, no prose, no blank lines.\n" +
  "Line types, one per line, in order:\n" +
  "D|<day/session name>|<minDays 2-5>\n" +
  "S|<Normal|AMRAP|EMOM|Circuit|Freestyle>|<section title>|<duration OR client aim note OR full freestyle text>\n" +
  "E|<Strength|Cardio|Mobility|Activation>|<library_id or blank>|<display name>|<sets>|<reps>|<rest secs>|<eachSide 0/1>|<linkedToNext 0/1>|<short member cue or blank>\n" +
  "Each session is a D line followed by its S (section header) and E (exercise) lines in order; a section's exercises are the E lines after its S line.\n" +
  "Rules:\n" +
  "- The library_id field MUST be an id from the list below (NOT the display name), for EVERY exercise including warm-up and mobility drills. If the written name isn't an exact match, choose the CLOSEST library exercise of the SAME movement/pattern (e.g. 'Rower Sprint' -> the Rower id; 'Burpee Over Rower' -> the Burpee id; 'Thoracic Bridge' -> the nearest t-spine mobility id) and use ITS id AND ITS exact library name as the display name. Leaving the id EMPTY is an absolute last resort, only when nothing in the library is remotely the same movement.\n" +
  "- blockType (E field 1) by the MOVEMENT, not just the section: Warm Up/Mobility & Mobility Flow -> Mobility; Fire Up -> Activation; any LOADED resistance movement (barbell/DB/KB/machine squat, hinge, press, row, pull, carry, thruster, clean, lunge) -> Strength EVEN inside an AMRAP/EMOM couplet, so it logs WEIGHT; genuine cardio (ergs/run/machine) and bodyweight conditioning drills -> Cardio; Zone 2/Active Recovery -> Cardio.\n" +
  "- FREESTYLE vs TRACKED conditioning — decide by whether a WEIGHT is logged per exercise:\n" +
  "  * FREESTYLE (text + score): engine/MetCon pieces scored as a whole with NO per-exercise weight — runs, erg intervals, mixed-modal chippers, for-time grinders, Hyrox-style stations, bodyweight AMRAPs, long-engine centrepieces AND short engine finishers. Emit S|Freestyle|<title>|<the WHOLE workout as readable text, \\n between lines> (e.g. '40 Min AMRAP\\n500m Row\\n200m Run\\n500m Ski') + REFERENCE E-lines (blockType Cardio, sets 0, reps blank). Never turn these into tracked sets.\n" +
  "  * TRACKED AMRAP/EMOM (Everfit-style, member logs weight round by round): a LOADED barbell/DB/KB couplet or triplet done for time (e.g. '10 min AMRAP: 8 DB Thrusters + 8 Bent-Over Rows'). KEEP it as S|AMRAP|<title>|<time> with real E-lines carrying blockType Strength + sets + reps (first exercise linkedToNext 1). Do NOT make loaded couplets Freestyle. This is how Fusion's AMRAP couplets must come through.\n" +
  "  Warm-up, fire-up and strength blocks stay as normal tracked sections.\n" +
  "- CLIENT-FACING ONLY: give each block a clear client-facing TITLE that signals its aim (e.g. 'Conditioning — Alactic Power'), not a bare 'Conditioning'. In the S-line 3rd field put ONE short plain-language sentence for the MEMBER on what to do / how to pace it (effort, work:rest) — NOT programming rationale or justification. On the KEY exercise you may add a short member cue in the E-line last field (<=8 words); keep cues sparse. Never put coach reasoning ('because…', 'to balance…') into any title, description or cue.\n" +
  "- IGNORE the coach round-up: if the week text ends with a 'Coach notes' / 'for you, not the client' section, DO NOT output any lines for it — it is not part of the workout.\n" +
  "- SUPERSET LINKING (linkedToNext): to link a group of N exercises as one superset, set linkedToNext=1 on the FIRST N-1 and 0 on the LAST. ALWAYS link: (a) the warm-up MOBILITY drills — the mobility trio/quad is ONE superset; (b) the FIRE UP exercises — the 2 activation moves are ONE superset done for 2 ROUNDS, so set sets=2 on BOTH and link the first; (c) anything the coach wrote as A1/A2, 'Superset:', a couplet or a paired circuit. Do not leave these as separate standalone exercises.\n" +
  "- AMRAP/EMOM/Circuit: the S-line 3rd field MUST be JUST the time (e.g. '10 Minutes') — put the aim in the TITLE. The couplet exercises are E lines under it, first one linked (linkedToNext 1). Do NOT fake a timed block with sets x reps like '3 rounds'.\n" +
  "- DURATION/TIME goes in the REPS field, never only in the cue. For any time-based work (cardio pulse-raisers, erg intervals, planks/holds, mobility holds) put the duration in reps as 'N min' or 'N sec' (e.g. reps='3 min', reps='45 sec'), and sets = number of rounds (1 for a single continuous effort). For a calorie interval put reps='max cals in 30s' (or 'N cals in 30s'). For distance/carries put reps as 'N m'. So 'Bike Erg 3 min easy' -> sets=1, reps='3 min', with 'easy pulse-raiser' as the cue. NEVER leave reps blank for a timed piece and hide the duration in the note.\n" +
  "- linkedToNext 1 = supersetted with the NEXT exercise. eachSide 1 when reps are per side. rest in whole seconds (0 if unstated). sets is a number; reps a short string.\n" +
  "- Keep EVERY day and exercise, in order. No pipe characters inside names, titles, notes or cues.\n\n" +
  "LIBRARY (id|name):\n" + idName;

// Structure one week's markdown into days[] with a deterministic label->id fallback.
async function structureWeek(blockText: string, lib: any[]) {
  const idName = (lib || []).map((e: any) => `${e.id}|${e.name}`).join("\n");
  let days: any[] = [];
  try {
    const sData = await claude(weekSysFor(idName), [{ role: "user", content: blockText }], 8000);
    const raw = (sData.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    days = parseDays(raw);
  } catch (_) { days = []; }
  const norm = (s: any) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const byName = new Map<string, string>();
  for (const e of (lib || [])) { const k = norm(e.name); if (k && !byName.has(k)) byName.set(k, e.id); }
  const keys = [...byName.keys()];
  for (const d of days) for (const r of (d.rows || [])) {
    if (r.isSection || (r.name && String(r.name).trim())) continue;
    const lbl = norm(r.label); if (!lbl) continue;
    let id = byName.get(lbl);
    if (!id) { const hit = keys.find((k) => k === lbl || k.includes(lbl) || lbl.includes(k)); if (hit) id = byName.get(hit); }
    if (id) r.name = id;
  }
  // Deterministic weight-tracking for LOADED exercises in tracked AMRAP/EMOM/Circuit blocks:
  // whatever blockType the LLM tagged, if the matched library exercise is weight-based, force
  // Strength + Weight & Reps so the member gets the KG column (Fusion loaded couplets, etc.).
  const libById = new Map<string, any>();
  for (const e of (lib || [])) libById.set(String(e.id), e);
  const isWeighted = (le: any) => {
    if (!le) return false;
    const mp = String(le.movement_pattern || "").toLowerCase();
    const eq = String(le.equipment || "").toLowerCase();
    // HARD GUARD: a bodyweight move, or a conditioning/plyometric/mobility pattern, is NEVER
    // weight-logged — even if the library trackingType tag wrongly says "Weight & Reps".
    // (e.g. "Burpee Over Bar" = conditioning/bodyweight must log reps, not KG.)
    if (eq === "bodyweight" || /conditioning|plyometric|mobility/.test(mp)) return false;
    const tt = le.trackingType;
    const arr = Array.isArray(tt) ? tt : String(tt || "").split(",").map((s: string) => s.trim());
    if (arr.some((x: string) => /weight/i.test(x))) return true;
    // Fallback if the library row has no tracking tag: judge by movement pattern —
    // resistance patterns are loaded; ergs/runs/cardio/mobility are not.
    return /squat|hinge|lunge|push|press|pull|row|carry|curl|extension|raise|thrust|clean|snatch|deadlift/.test(mp);
  };
  // A loaded resistance movement should log WEIGHT wherever it sits — not just in a section that
  // happens to be typed "AMRAP". If the movement is loaded (by library tag/pattern, or its name
  // clearly names a loaded lift) but got mis-tagged Cardio/Activation -> Reps Only, promote it to
  // Weight & Reps. Skip Freestyle reference rows and genuine cardio/bodyweight moves.
  const loadedByLabel = (lbl: string) =>
    /barbell|dumbbell|\bdb\b|\bkb\b|kettlebell|goblet|bench press|overhead press|shoulder press|\bpress\b|\brow\b|deadlift|\brdl\b|squat|lunge|hip thrust|thruster|clean|snatch|\bcurl\b|pulldown|pull-?up|chin-?up|carry|farmer/i.test(lbl);
  for (const d of days) {
    for (const r of (d.rows || [])) {
      if (r.isSection || r.reference) continue;
      const tt = Array.isArray(r.trackingType) ? r.trackingType : [];
      const hasWeight = tt.some((x: string) => /weight/i.test(String(x)));
      if (hasWeight) continue;                       // already logs weight — leave it
      const onlyReps = tt.length === 1 && /reps only/i.test(String(tt[0]));
      if (!onlyReps && tt.length) continue;          // Time/Distance/Calories pieces stay as-is
      const le = libById.get(String(r.name));
      const loaded = (le && isWeighted(le)) || loadedByLabel(String(r.label || ""));
      if (loaded) { r.blockType = "Strength"; r.trackingType = ["Weight & Reps"]; }
    }
  }
  // Deterministic superset linking: whatever the LLM did, force the warm-up mobility drills and
  // the fire-up activation pair to be linked supersets (fire-up = 2 rounds). Walk each section's
  // run of consecutive exercises of the same superset-able blockType and link all-but-last.
  for (const d of days) {
    const rows = d.rows || [];
    let i = 0;
    while (i < rows.length) {
      if (rows[i].isSection) { i++; continue; }
      // gather the run of consecutive non-section exercises until the next section
      let j = i;
      while (j < rows.length && !rows[j].isSection) j++;
      // Within this section, find maximal CONTIGUOUS runs of the same superset-able blockType
      // (mobility drills, or fire-up activation) and link each run as one superset.
      let k = i;
      while (k < j) {
        const bt = String(rows[k].blockType || "").toLowerCase();
        if ((bt === "mobility" || bt === "activation") && !rows[k].reference) {
          let e = k;
          while (e < j && String(rows[e].blockType || "").toLowerCase() === bt && !rows[e].reference) e++;
          const grp = rows.slice(k, e);            // contiguous same-type run
          if (grp.length >= 2) {
            grp.forEach((r: any, idx: number) => {
              r.linkedToNext = idx < grp.length - 1;
              if (bt === "activation") r.sets = Math.max(Number(r.sets) || 0, 2); // fire-up = 2 rounds
            });
          } else if (grp.length === 1 && bt === "activation") {
            grp[0].sets = Math.max(Number(grp[0].sets) || 0, 2);
          }
          k = e;
        } else { k++; }
      }
      i = j;
    }
  }
  // Equal sets across a superset: walk each linkedToNext chain and set every exercise in it to the
  // group's max sets, so a lift on 4 sets paired with an accessory on 3 becomes 4 & 4.
  for (const d of days) {
    const rows = d.rows || [];
    let a = 0;
    while (a < rows.length) {
      if (rows[a].isSection || rows[a].reference) { a++; continue; }
      let e = a;
      while (e < rows.length && rows[e].linkedToNext && !rows[e].isSection) e++;
      // rows a..e are one superset (e is the last, un-linked member)
      const group = rows.slice(a, e + 1).filter((r: any) => !r.isSection && !r.reference);
      if (group.length >= 2) {
        const maxSets = Math.max(...group.map((r: any) => Number(r.sets) || 0));
        if (maxSets > 0) group.forEach((r: any) => { r.sets = maxSets; });
      }
      a = e + 1;
    }
  }
  return days;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const bodyIn = await req.json();
    const { action, chatId, message, stream, draft, memberId, repeatTo, weekNumber, weeksTotal } = bodyIn;

    // --- Recent chats list (service role — bypasses RLS so it always shows) ---
    if (action === "list") {
      const { data } = await sb.from("programme_chats")
        .select("id,title,stream,updated_at").order("updated_at", { ascending: false }).limit(40);
      return jsonResp({ chats: data || [] });
    }
    // --- Save the draft after a manual table edit (coach edits cells directly) ---
    if (action === "save_draft" && chatId && draft) {
      await sb.from("programme_chats").update({ draft, updated_at: new Date().toISOString() }).eq("id", chatId);
      return jsonResp({ ok: true, draft });
    }
    // --- Reopen a past chat (messages + draft) ---
    if (action === "get" && chatId) {
      const { data } = await sb.from("programme_chats").select("messages,draft,stream,title").eq("id", chatId).maybeSingle();
      // Flatten each message's content to a plain string. Assistant turns are stored as
      // arrays of content blocks ([{type:"text",text:"..."}]); the chat UI expects strings,
      // so normalise here to avoid ".split is not a function" when rehydrating old chats.
      const toText = (c: any): string =>
        typeof c === "string" ? c
          : Array.isArray(c) ? c.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("\n")
          : (c && typeof c.text === "string") ? c.text : "";
      const messages = ((data?.messages as any[]) || [])
        .map((m: any) => ({ role: m.role, content: toText(m.content) }))
        .filter((m: any) => m.content.trim());
      return jsonResp({ ...(data || {}), messages });
    }

    const [{ data: recipe }, { data: prefs }, { data: lib }] = await Promise.all([
      sb.from("stream_recipes").select("system_prompt").eq("stream", stream || "").maybeSingle(),
      sb.from("coaching_preferences").select("rule,scope").eq("active", true),
      sb.from("exercises").select("id,name,movement_pattern,movement_family,equipment,difficulty,unilateral,role,contraindications,trackingType").order("movement_pattern"),
    ]);
    const libStr = (lib || []).map((e: any) =>
      `${e.id}|${e.name}|${e.movement_pattern}|${e.movement_family}|${e.equipment}|${e.difficulty}${e.unilateral ? "|uni" : ""}${(e.contraindications || []).length ? "|avoid:" + (e.contraindications || []).join("/") : ""}`
    ).join("\n");
    let member: any = null;
    if (memberId) { const { data } = await sb.from("member_goals").select("*").eq("member_id", memberId).maybeSingle(); member = data; }

    // --- sync_week is now a PASSTHROUGH: the chat turn already builds the draft server-side, so
    // this just returns the stored draft (prevents double-processing / duplicate days).
    if (action === "sync_week" && chatId) {
      const { data: chat } = await sb.from("programme_chats").select("draft").eq("id", chatId).maybeSingle();
      return jsonResp({ draft: (chat as any)?.draft || null });
    }

    // --- Finalise: hand the current living draft to the editor (with optional repeat-to-N). ---
    if (action === "structure" && chatId) {
      const { data: chat } = await sb.from("programme_chats").select("messages,stream,draft").eq("id", chatId).maybeSingle();
      const chatStream = (chat as any)?.stream || null;
      const stored = (chat as any)?.draft;
      let parsed: any = (stored && Array.isArray(stored.weeks) && stored.weeks.some((w: any) => (w.days || []).length))
        ? stored
        : null;

      // Fallback for older chats with no living draft: derive per-week from the transcript.
      if (!parsed) {
        const msgs = ((chat?.messages as any[]) || []);
        const looksLikeWeek = (t: string) =>
          (t.match(/min\s*days/gi) || []).length >= 3 ||
          (t.match(/\bday\s*\d/gi) || []).length >= 3 ||
          (t.match(/\bsession\s*\d/gi) || []).length >= 3;
        const blocks = msgs.filter((m: any) => m.role === "assistant").map((m: any) => flatText(m.content).trim()).filter((t: string) => looksLikeWeek(t)).slice(-8);
        const weekResults = await Promise.all(blocks.map((b: string) => structureWeek(b, lib)));
        const weeks = weekResults.map((days: any, i: number) => ({ week: i + 1, days })).filter((w: any) => w.days.length);
        if (weeks.length) parsed = { name: (chatStream ? `${chatStream} Programme` : "Programme"), stream: chatStream, weeks };
      }

      // Optionally repeat the built block to fill N weeks (exact copy, wrapping).
      const targetN = Number(repeatTo) || 0;
      if (parsed && Array.isArray(parsed.weeks) && targetN > parsed.weeks.length) {
        const block = parsed.weeks.slice(); const B = block.length;
        for (let t = B + 1; t <= targetN; t++) { const clone = JSON.parse(JSON.stringify(block[(t - 1) % B])); clone.week = t; parsed.weeks.push(clone); }
      }
      if (parsed) {
        await sb.from("programme_chats").update({ draft: parsed, updated_at: new Date().toISOString() }).eq("id", chatId);
        try {
          const wks = parsed?.weeks || [];
          const lastDays = (wks[wks.length - 1]?.days) || [];
          const cardSummary = (wks.length > 1 ? `${wks.length} weeks. Latest — ` : "") + lastDays.map((d: any) => {
            const exs = (d.rows || []).filter((r: any) => !r.isSection).slice(0, 3).map((r: any) => r.label || r.name).filter(Boolean);
            return `${d.day || "Day"} (min${d.minDays ?? "?"}): ${exs.join(", ")}`;
          }).join(" | ");
          await sb.from("programme_history").insert({ stream: parsed.stream || chatStream || null, member_id: memberId || null, title: parsed.name || "Programme", summary: cardSummary, draft: parsed, chat_id: chatId });
        } catch (_) { /* history is best-effort */ }
      }
      return jsonResp({ draft: parsed });
    }

    const rules = (prefs || []).filter((p: any) => p.scope === "global" || p.scope === stream).map((p: any) => `- ${p.rule}`).join("\n");

    // --- Cross-chat memory: recent programmes already built for this stream / member ---
    let past: any[] = [];
    {
      const { data } = await sb.from("programme_history")
        .select("title,summary,created_at,member_id")
        .eq("stream", stream || "").order("created_at", { ascending: false }).limit(6);
      past = data || [];
    }
    if (memberId) {
      const { data } = await sb.from("programme_history")
        .select("title,summary,created_at,member_id")
        .eq("member_id", memberId).order("created_at", { ascending: false }).limit(4);
      const seen = new Set(past.map((h: any) => (h.title || "") + (h.created_at || "")));
      past = [...(data || []).filter((h: any) => !seen.has((h.title || "") + (h.created_at || ""))), ...past];
    }
    const pastStr = past.slice(0, 8)
      .map((h: any) => `- ${(h.created_at || "").slice(0, 10)}${h.member_id ? " [this member]" : ""} ${h.title}: ${h.summary}`)
      .join("\n");

    const nSessions = String(stream || "").toLowerCase() === "grouppt" ? 6 : 5;
    const system = [
      "You are an expert strength & conditioning coach programming for Eat Train Live. You draft training programmes in a conversation with a human coach, reason about your choices, and take feedback.",
      stream ? `STREAM: ${stream}. ${recipe?.system_prompt || ""}` : "",
      rules ? `COACHING RULES (must follow):\n${rules}` : "",
      pastStr ? `RECENTLY BUILT PROGRAMMES (these were committed in earlier sessions — progress from them: wave the primaries forward, avoid repeating the same heavy lifts, finishers or accessory choices you used last time unless deliberately deloading; keep the block coherent week-on-week):\n${pastStr}` : "",
      member ? `MEMBER CONTEXT: ${JSON.stringify(member)}` : "",
      weekNumber ? `YOU ARE WORKING ON WEEK ${weekNumber}${weeksTotal ? ` of a ${weeksTotal}-week block` : ""} ONLY (never other weeks). If the coach asks to build/generate/create the week (or this is the first message for it), author the COMPLETE week — ALL ${nSessions} sessions, every one in full, in one reply. Only output a SINGLE day when the coach explicitly asks to change/revise that one specific day (then reprint just that day, headed 'Day N — ...'). Never reply with a partial week on a build.` : "",
      `EXERCISE LIBRARY (pick exercise_id directly from here — never invent exercises; format: id|name|pattern|family|equipment|difficulty[|uni][|avoid:injuries]):\n${libStr}`,
      "Pick exercises DIRECTLY from the library above (never invent them; do NOT call search_exercises - you already have the whole library). Build ONE week (up to ${nSessions} sessions) per turn.",
      "EXERCISE NAMING IS STRICT: write each exercise using the library's EXACT name, copied verbatim from the list (same spelling and wording) — do NOT rename, abbreviate, add qualifiers, or create variations (e.g. never 'Burpee Over Rower', 'Rower Sprint', 'Thoracic Bridge w/reach' if those exact names aren't in the library). If the movement you want isn't in the library, pick the CLOSEST library exercise that IS listed and use its exact name instead. Every single exercise in your reply — including warm-up cardio, mobility drills and fire-up moves — MUST be an exact library name. If you truly cannot find anything close for a slot, say so in the Why paragraph rather than inventing a name.",
      `ALWAYS author the FULL week per the stream's recipe — ${nSessions} sessions this stream. For Stronger, Performance, Fusion and Foundations stamp each session with \`minDays\` (2, 3, 4 or 5) per the stream's session menu; the member sees only sessions where minDays <= their chosen days, so the two minDays:2 sessions must each be self-sufficient and balanced. For Group PT author all 6 sessions and tag every one minDays:2 (drop-in — all sessions available to everyone). Never generate a partial week — always all ${nSessions}, tagged.`,
      "RESPOND WITH THE FULL WEEK AS READABLE MARKDOWN in your reply. For each session: a heading with the session name and its (minDays: N) tag, then each exercise on its own line as Name - sets x reps (short note), grouped by section (Warm Up/Mobility, Fire Up, Strength Blocks, Pump City/Core). When two or more exercises are a SUPERSET / paired couplet, label them clearly (e.g. prefix with A1/A2 or write 'Superset:') so the pairing is unambiguous. CLIENT-FACING vs COACH RATIONALE: the content INSIDE the sessions (block titles, descriptions, exercise cues) must be CLIENT-FACING ONLY — what to do, how to pace it, effort/RPE, technique cues the member benefits from. Do NOT write programming rationale or justification inside the sessions ('this trains alactic power because…', 'to balance the squat volume…'). Put ALL of your reasoning — why the week is laid out this way, the wave, the stimulus logic — in ONE clearly separated section at the very END headed '## Coach notes (for you, not the client)'. That round-up is for the coach only and is NOT part of the workout. Keep it tight. Do NOT call save_draft or any tool for a normal build - just write the whole programme in your text reply so the coach can read it. Only use add_preference if the coach explicitly teaches you a rule.",
    ].filter(Boolean).join("\n\n");

    let history: any[] = [];
    if (chatId) { const { data } = await sb.from("programme_chats").select("messages").eq("id", chatId).maybeSingle(); history = (data?.messages as any[]) || []; }
    const messages: any[] = [...history, { role: "user", content: message }];

    const state: any = { draft: draft || null };
    const data = await claude(system, messages);
    const content = data.content || [];
    messages.push({ role: "assistant", content });
    const assistantText = content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
    if (!assistantText) {
      console.error("EMPTY assistant. stop_reason=", data.stop_reason,
        " | content=", JSON.stringify(data.content || data).slice(0, 800),
        " | usage=", JSON.stringify(data.usage || {}));
    }

    // Update the LIVING DRAFT server-side from this reply, so it's always correct without the app
    // needing a separate sync call. Structure the reply and MERGE it into the current week by day.
    let draftObj: any = (state.draft && Array.isArray(state.draft.weeks)) ? state.draft : null;
    if (!draftObj && chatId) {
      const { data: d } = await sb.from("programme_chats").select("draft").eq("id", chatId).maybeSingle();
      if (d?.draft && Array.isArray((d.draft as any).weeks)) draftObj = d.draft;
    }
    if (!draftObj) draftObj = { name: (stream ? `${stream} Programme` : "Programme"), stream: stream || null, weeks: [] };

    let unmatched: string[] = [];
    const looksProgramme = /(?:^|\n)\s*day\s*\d/i.test(assistantText) || /min\s*days/i.test(assistantText);
    if (weekNumber && assistantText && looksProgramme) {
      const wkNo = Math.max(1, Number(weekNumber) || 1);
      const total = Math.max(wkNo, Number(weeksTotal) || 0, draftObj.weeks.length);
      while (draftObj.weeks.length < total) draftObj.weeks.push({ week: draftObj.weeks.length + 1, days: [] });
      const newDays = await structureWeek(assistantText, lib);
      const dayNo = (name: any) => { const m = String(name || "").match(/day\s*(\d+)/i); return m ? parseInt(m[1]) : null; };
      const normS = (s: any) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const prevDays: any[] = (draftObj.weeks[wkNo - 1]?.days) || [];
      let finalDays: any[];
      if (newDays.length >= 3 || !prevDays.length) {
        // a full-week build/reprint -> REPLACE the week's days (no duplication)
        finalDays = newDays;
      } else {
        // a partial edit (1-2 days) -> merge those day(s) into the existing week, keep the rest
        finalDays = prevDays.slice();
        for (const nd of newDays) {
          const no = dayNo(nd.day);
          let idx = no != null ? finalDays.findIndex((d: any) => dayNo(d.day) === no) : -1;
          if (idx < 0) idx = finalDays.findIndex((d: any) => normS(d.day) === normS(nd.day));
          if (idx >= 0) finalDays[idx] = nd; else finalDays.push(nd);
        }
      }
      finalDays.sort((a: any, b: any) => (dayNo(a.day) ?? 99) - (dayNo(b.day) ?? 99));
      if (finalDays.length) { draftObj.weeks[wkNo - 1] = { week: wkNo, days: finalDays }; draftObj.weeks.forEach((w: any, i: number) => { w.week = i + 1; }); }
      // Auto-flag the Performance long-engine blocks (Day 3 & Day 5, minDays 3/5) as LEADERBOARD
      // sections so every generated week's engine is a leaderboard with zero coach effort. The
      // coach can still toggle any section's leaderboard flag by hand in the builder.
      if (String(stream || "").toLowerCase() === "performance") {
        for (const d of finalDays) {
          if (d.minDays !== 3 && d.minDays !== 5) continue;
          for (const r of (d.rows || [])) {
            if (r.isSection && String(r.sectionType || "").toLowerCase() === "freestyle") {
              r.leaderboard = true;
              r.leaderboardTitle = `${d.day || "Engine"} — Leaderboard`;
            }
          }
        }
      }
      // Group PT: the Finisher section offers TWO supersets as a PICK-ONE (member does one).
      if (String(stream || "").toLowerCase() === "grouppt") {
        for (const d of finalDays) {
          for (const r of (d.rows || [])) {
            if (r.isSection && /finish/i.test(String(r.name || ""))) r.pickOne = true;
          }
        }
      }
      // Which exercises the AI named but that DON'T exist in the library (no id matched).
      // These won't link/track until added, so name them explicitly for the coach.
      const seen = new Set<string>();
      for (const d of finalDays) for (const r of (d.rows || [])) {
        if (r.isSection) continue;
        const hasId = r.name && String(r.name).trim();
        const lbl = String(r.label || "").trim();
        if (!hasId && lbl && !seen.has(lbl.toLowerCase())) { seen.add(lbl.toLowerCase()); unmatched.push(lbl); }
      }
    }
    // Surface the unmatched names in the reply itself (chat shows the transcript, not just a count).
    let assistantOut = assistantText;
    if (unmatched.length) {
      const note = `\n\n---\n⚠️ ${unmatched.length} exercise${unmatched.length > 1 ? "s aren't" : " isn't"} in your library yet, so ${unmatched.length > 1 ? "they" : "it"} won't link or track until added:\n${unmatched.map((n) => `• ${n}`).join("\n")}\n\nAdd ${unmatched.length > 1 ? "them" : "it"} in Manage Exercises (or ask me to swap for a library exercise), then rebuild this week.`;
      assistantOut = assistantText + note;
      content.push({ type: "text", text: note });   // persist into the saved transcript too
    }

    let id = chatId;
    if (id) {
      await sb.from("programme_chats").update({ messages, draft: draftObj, updated_at: new Date().toISOString() }).eq("id", id);
    } else {
      const { data } = await sb.from("programme_chats").insert({ stream, title: (message || "").slice(0, 60), messages, draft: draftObj }).select("id").single();
      id = data?.id;
    }

    return jsonResp({ chatId: id, assistant: assistantOut, draft: draftObj, unmatched });
  } catch (e) {
    console.error("coach-agent error:", String(e));
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
