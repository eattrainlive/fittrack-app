/**
 * Tracking-type resolution for programme exercises.
 *
 * Tracking is a PER-EXERCISE-IN-A-PROGRAMME choice (stored on the row's
 * `trackingType`), not a rigid library property. The AI writes a
 * `trackingType` onto each row based on what it prescribed (time / reps /
 * distance / calories); the coach can toggle it; the library value is only a
 * fallback default.
 *
 * `resolveTrackingType` precedence: ROW → library → block-type default.
 * Junk legacy values (not in VALID_TRACKING) are ignored.
 */

export const DEFAULT_TRACKING = ["Weight & Reps"];

/** The real tracking types the app's logging columns understand.
 *  "Reps Only" is valid — it shows a REPS column with no weight. */
export const VALID_TRACKING = [
  "Weight & Reps",
  "Reps Only",
  "Time Only",
  "Distance & Time",
  "Weight & Distance",
  "Calories",
  "Calories & Time",
];

/**
 * Normalise a tracking value (array or comma/semicolon-joined string) into
 * a clean array of trimmed labels.
 */
export const normaliseTracking = (v: any): string[] => {
  if (Array.isArray(v) && v.length > 0)
    return v.map((s) => String(s).trim()).filter(Boolean);
  if (typeof v === "string" && v.trim())
    return v
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
};

/**
 * Sensible default when nothing valid resolves, based on the block the
 * exercise sits in. Cardio machines not in the library should default to
 * time/distance/calories — never reps.
 */
const defaultByBlock = (ex: any): string[] => {
  const bt = String(ex?.blockType ?? "").toLowerCase();
  if (bt === "cardio")
    return ["Distance & Time", "Time Only", "Calories", "Calories & Time"];
  if (bt === "mobility") return ["Time Only"];
  return [...DEFAULT_TRACKING]; // Strength / Activation / unknown
};

/**
 * Resolve the tracking type for a programme exercise. Returns a clean array;
 * never empty.
 *
 * Precedence is ROW-FIRST (per-exercise-in-a-programme wins):
 *  1. The exercise ROW's own `trackingType` — the AI/coach choice for this
 *     programme. This is what the AI writes based on what it prescribed
 *     (time / reps / distance / calories), and what the coach can toggle.
 *     Only used if it contains at least one REAL tracking type (junk legacy
 *     values like "Reps Only " / "Weight & Repsxyz" are ignored).
 *  2. If the row has no valid value, fall back to the LIBRARY entry's
 *     `trackingType` (matched by id or name) — a sensible default.
 *  3. Otherwise default by the exercise's blockType (cardio → time, not reps).
 *
 * Note: the coach's deliberate Reps/Time choice is stored as `trackingType`
 * on the row (not a transient `trackingMode`), so it persists with the
 * programme/workout.
 */
export const resolveTrackingType = (
  ex: any,
  exerciseLibrary: any[],
): string[] => {
  // 1. ROW wins if it carries a real tracking type.
  const own = normaliseTracking(ex?.trackingType);
  if (own.some((x) => VALID_TRACKING.includes(x))) return own;

  // 2. No valid row value → library default.
  const libEx = exerciseLibrary.find(
    (le) =>
      String(le.id) === String(ex?.name) ||
      String(le.name) === String(ex?.name),
  );
  const libTrack = normaliseTracking(libEx?.trackingType);
  if (libTrack.some((x) => VALID_TRACKING.includes(x))) return libTrack;

  // 3. Nothing valid → default by block type (cardio → time, not reps).
  return defaultByBlock(ex);
};

/**
 * Sync a programme exercise's trackingType with the prescription values it
 * actually carries, so a 30s hold is stored as "Time Only" (not Weight & Reps)
 * even if the coach didn't toggle the type. This is the root-cause fix for
 * time-based exercises showing as "1×10" — the stored trackingType must match
 * the fields used.
 *
 * Rules (value-driven, additive only where ambiguous):
 *  - time (mins/secs) + distance → "Distance & Time"
 *  - time only → "Time Only"
 *  - distance only → keep existing if it already covers distance, else "Distance & Time"
 *  - calories → "Calories"
 *  - weight + reps → "Weight & Reps"
 *  - reps only → "Reps Only"
 * If the exercise already has an explicit trackingType that matches the values,
 * it's left untouched.
 */
export const syncTrackingWithValues = (ex: any): string[] => {
  const hasTime =
    (Number(ex?.timeMins) || 0) > 0 || (Number(ex?.timeSecs) || 0) > 0;
  const hasDist = (Number(ex?.distance) || 0) > 0;
  const hasCals = (Number(ex?.calories) || 0) > 0;

  const own = normaliseTracking(ex?.trackingType).filter((x) =>
    VALID_TRACKING.includes(x),
  );

  // Positive time/distance/calorie VALUES are strong signals — infer those.
  if (hasCals && hasTime) return ["Calories & Time"];
  if (hasTime && hasDist) return ["Distance & Time"];
  if (hasTime) return ["Time Only"];
  if (hasCals) return ["Calories"];
  if (hasDist)
    return own.includes("Weight & Distance")
      ? ["Weight & Distance"]
      : ["Distance & Time"];

  // No time/dist/cal values → this is a reps/weight exercise.
  // RESPECT the explicit trackingType — do NOT downgrade "Weight & Reps" to
  // "Reps Only" just because no weight VALUE is prescribed (weight is entered
  // by the member at logging time). A coach who deliberately wants Reps Only
  // still gets it, because that's stored on the row's `trackingType`.
  if (own.length) return own;

  // No explicit type at all → default to Weight & Reps when reps are present
  // (strength bias), so loaded moves keep their KG column.
  const hasReps = (Number(ex?.reps) || 0) > 0;
  return hasReps ? ["Weight & Reps"] : [...DEFAULT_TRACKING];
};

/**
 * Runtime tracking resolver for the logging screen (`trackingOf`).
 * Identical logic to `resolveTrackingType` — kept as a thin wrapper so the
 * logging screen doesn't need to know the resolution internals.
 */
export const trackingOf = (ex: any, exerciseLibrary: any[]): string[] =>
  resolveTrackingType(ex, exerciseLibrary);
