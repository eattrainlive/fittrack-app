/**
 * Tracking-type resolution for programme exercises.
 *
 * The root cause of per-member divergence: when a programme exercise has no
 * `trackingType` stored (null/blank), the logging screen falls back to each
 * member's OWN exercise-library lookup. Members have stale/partial libraries
 * (or an exercise tagged "Reps Only"), so identical programmes render different
 * logging columns per member.
 *
 * Fix: bake an explicit `trackingType` onto every programme exercise at save
 * time (resolved from the coach's library — the single source of truth), and
 * harden the runtime fallback to match by name too, defaulting to "Weight & Reps".
 */

export const DEFAULT_TRACKING = ["Weight & Reps"];

/** The four real tracking types the app's logging columns understand. */
export const VALID_TRACKING = [
  "Weight & Reps",
  "Time Only",
  "Distance & Time",
  "Calories",
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
  if (bt === "cardio") return ["Distance & Time", "Time Only", "Calories"];
  if (bt === "mobility") return ["Time Only"];
  return [...DEFAULT_TRACKING]; // Strength / Activation / unknown
};

/**
 * Resolve the tracking type for a programme exercise. Returns a clean array;
 * never empty.
 *
 * Precedence is LIBRARY-FIRST:
 *  1. The library entry (matched by id or name) wins for a matched exercise.
 *     Programme rows carry a stale `trackingType` baked in at save time (e.g. a
 *     loaded move with ["Reps Only"], or a cardio machine with
 *     ["Weight & Reps"]) — that baked value is stale baggage, not a deliberate
 *     override, so the library (the single source of truth) takes priority.
 *  2. If there's no library match, fall back to the exercise's own trackingType
 *     — but only if it contains at least one REAL tracking type.
 *  3. Otherwise default by the exercise's blockType (cardio → time, not reps).
 *
 * Note: the coach's deliberate Reps/Time choice is stored as `trackingMode`,
 * not `trackingType`, so this precedence never overrides an intentional toggle.
 */
export const resolveTrackingType = (
  ex: any,
  exerciseLibrary: any[],
): string[] => {
  // 1. LIBRARY wins for a matched exercise.
  const libEx = exerciseLibrary.find(
    (le) =>
      String(le.id) === String(ex?.name) ||
      String(le.name) === String(ex?.name),
  );
  const libTrack = normaliseTracking(libEx?.trackingType);
  if (libTrack.some((x) => VALID_TRACKING.includes(x))) return libTrack;

  // 2. No library match → use the exercise's own value if it's valid.
  const own = normaliseTracking(ex?.trackingType);
  if (own.some((x) => VALID_TRACKING.includes(x))) return own;

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
  const hasWeight = (Number(ex?.weight) || 0) > 0;
  const hasReps = (Number(ex?.reps) || 0) > 0;

  // Value-driven inference.
  if (hasTime && hasDist) return ["Distance & Time"];
  if (hasTime) return ["Time Only"];
  if (hasCals) return ["Calories"];
  if (hasDist) return ["Distance & Time"];
  if (hasWeight && hasReps) return ["Weight & Reps"];
  if (hasReps) return ["Reps Only"];

  // No prescription values — keep whatever trackingType is already set.
  const own = normaliseTracking(ex?.trackingType);
  return own.length ? own : [...DEFAULT_TRACKING];
};

/**
 * Runtime tracking resolver for the logging screen (`trackingOf`).
 * Identical logic to `resolveTrackingType` — kept as a thin wrapper so the
 * logging screen doesn't need to know the resolution internals.
 */
export const trackingOf = (ex: any, exerciseLibrary: any[]): string[] =>
  resolveTrackingType(ex, exerciseLibrary);
