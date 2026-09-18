/**
 * Normalise a template exercise's reps into the proper model:
 * a numeric `reps` plus an `eachSide` boolean.
 *
 * Legacy programme data stored reps as a string like "10/10" (meaning
 * 10 each side). This converts that into reps = 10 + eachSide = true,
 * so volume doubles correctly, PB detection records a clean number,
 * and the UI shows an "Each Side" label instead of "10/10".
 */
export function normaliseReps(ex: any): { reps: number; eachSide: boolean } {
  let eachSide = !!ex.eachSide;
  let reps: number;

  const raw = ex.reps;
  if (typeof raw === "string" && raw.includes("/")) {
    eachSide = true;
    reps = parseInt(raw.split("/")[0], 10);
  } else {
    reps = raw !== undefined ? parseInt(String(raw), 10) : 10;
  }
  if (Number.isNaN(reps)) reps = 10;

  return { reps, eachSide };
}

/**
 * Build the default setsData array for a template exercise, using
 * normalised reps + eachSide. Mirrors the shape used by the session
 * start paths in Workouts.tsx.
 */
export function buildDefaultSetsData(ex: any, setCount?: number) {
  const { reps, eachSide } = normaliseReps(ex);
  const count = setCount ?? ex.sets ?? 3;
  return Array.from({ length: count }).map((_, i) => ({
    id: Date.now().toString() + i,
    reps,
    weight: ex.weight || 0,
    distance: ex.distance || 0,
    timeMins: ex.timeMins || 0,
    timeSecs: ex.timeSecs || 0,
    calories:
      ex.calories ||
      (ex.reps && (ex.trackingType ?? []).includes?.("Calories") ? reps : 0),
    completed: false,
  }));
}
