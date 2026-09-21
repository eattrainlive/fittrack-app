/**
 * Warm-up / Fire-up helpers extracted from Admin.tsx.
 *
 * fixWarmup ensures each Warm Up section has exactly one cardio machine
 * (varied by day) + up to 3 mobility drills. applyWarmupFireupSupersets
 * chains the exercises within a Warm Up / Fire Up section into a superset.
 */

export const CARDIO_MACHINES = [
  { name: "Bike Erg", id: "bike-erg" },
  { name: "Ski Erg", id: "ski-erg" },
  { name: "Rower", id: "rower" },
  { name: "Air Bike", id: "air-bike" },
  { name: "Treadmill Run", id: "treadmill-run" },
];

// A genuine cardio machine = the WHOLE name is a machine (so "Burpee Over Rower" is NOT one).
export const MACHINE_RE =
  /^(bike[- ]?erg|ski[- ]?erg|rower|air[- ]?bike|assault bike|echo bike|treadmill(?: run)?|curved treadmill|stairmaster)$/i;

export const WARMUP_MOBILITY_COUNT = 3;

const toArr = (v: any) =>
  Array.isArray(v)
    ? v
    : v
      ? String(v)
          .split(/[;,]/)
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];

export function fixWarmup(
  exercises: any[],
  dayIndex: number,
  exerciseLibrary: any[],
) {
  const i = exercises.findIndex(
    (e: any) => e.isSection && /warm ?up/i.test(e.name || ""),
  );
  if (i === -1) return exercises;

  // Find the end of the warm-up section (next section header)
  let end = exercises.findIndex((e: any, k: number) => k > i && e.isSection);
  if (end === -1) end = exercises.length;

  let items = exercises.slice(i + 1, end);

  const libByName = (ex: any) =>
    exerciseLibrary.find((le: any) => String(le.id) === String(ex?.name));
  const isCardioMachine = (ex: any) => {
    if (!ex || !ex.name || ex.isSection) return false;
    const libEx = libByName(ex);
    return !!libEx && MACHINE_RE.test(String(libEx.name).trim());
  };

  const isMobilityDrill = (ex: any) => {
    if (!ex || !ex.name || ex.isSection) return false;
    const libEx = libByName(ex);
    if (!libEx) return false;
    const mv = toArr(libEx.movementType).map((s: string) => s.toLowerCase());
    const cat = toArr(libEx.category).map((s: string) => s.toLowerCase());
    return (
      mv.some((t: string) =>
        [
          "warm up",
          "fire up",
          "mobility",
          "activation",
          "soft tissue",
          "potentiation",
          "soft-tissue",
        ].some((k) => t.includes(k)),
      ) ||
      cat.some((t: string) =>
        [
          "warm up",
          "mobility",
          "soft tissue",
          "soft-tissue",
          "activation",
        ].some((k) => t.includes(k)),
      )
    );
  };

  // (a) Strip anything that isn't a cardio machine or a mobility drill
  items = items.filter((e: any) => isCardioMachine(e) || isMobilityDrill(e));

  // (b) Ensure exactly ONE cardio machine from the palette, varied by day
  const machines = items.filter(isCardioMachine);
  const mobility = items.filter((e: any) => !isCardioMachine(e));

  // pick the day's machine, resolving to a real library exercise; fall back to ANY real machine
  const pref =
    CARDIO_MACHINES[
      ((dayIndex % CARDIO_MACHINES.length) + CARDIO_MACHINES.length) %
        CARDIO_MACHINES.length
    ];
  let machineEx =
    exerciseLibrary.find((le: any) => String(le.id) === pref.id) ||
    exerciseLibrary.find(
      (le: any) => String(le.name).toLowerCase() === pref.name.toLowerCase(),
    ) ||
    exerciseLibrary.find((le: any) => MACHINE_RE.test(String(le.name).trim())); // any genuine machine

  let machineItem: any = null;
  if (machineEx) {
    machineItem = {
      id: Date.now() + Math.random(),
      name: machineEx.id,
      timeMins: 3,
      timeSecs: 0,
      sets: 1,
      staffNotes: "3 min easy — build gently",
      trackingType: ["Time Only"],
      isSection: false,
    };
  }

  // (c) Trim mobility to exactly 3
  const trimmedMobility = mobility.slice(0, WARMUP_MOBILITY_COUNT);

  // Rebuild: 1 machine + up to 3 mobility drills
  const rebuilt = machineItem
    ? [machineItem, ...trimmedMobility]
    : trimmedMobility;
  exercises.splice(i + 1, end - (i + 1), ...rebuilt);
  return exercises;
}

// Within each Warm Up / Fire Up section, chain the exercises into a single superset.
export function applyWarmupFireupSupersets(exercises: any[]) {
  if (!Array.isArray(exercises)) return exercises;
  let inGroup = false;
  for (let i = 0; i < exercises.length; i++) {
    const e = exercises[i];
    if (e.isSection) {
      const nm = String(e.name || e.sectionType || "").toLowerCase();
      inGroup = nm.includes("warm up") || nm.includes("fire up"); // matches "Warm Up/Mobility" and "Fire Up"
      continue;
    }
    if (inGroup) {
      const next = exercises[i + 1];
      // link to next only within the same section
      e.linkedToNext = !!(next && !next.isSection);
    }
  }
  return exercises;
}
