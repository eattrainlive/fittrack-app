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
 * Resolve the tracking type for a programme exercise, looking up the library
 * by id OR name. Returns a clean array; never empty (defaults to Weight & Reps).
 */
export const resolveTrackingType = (
  ex: any,
  exerciseLibrary: any[],
): string[] => {
  // 1. Explicit per-exercise override (coach-set)
  const own = normaliseTracking(ex?.trackingType);
  if (own.length) return own;

  // 2. Library lookup by id (programme `name` = library `id`) or by name
  const libEx = exerciseLibrary.find(
    (le) =>
      String(le.id) === String(ex?.name) ||
      String(le.name) === String(ex?.name),
  );
  const libTrack = normaliseTracking(libEx?.trackingType);
  if (libTrack.length) return libTrack;

  // 3. Safe default — never silently reps-only
  return [...DEFAULT_TRACKING];
};

/**
 * Runtime tracking resolver for the logging screen (`trackingOf`).
 * Identical logic to `resolveTrackingType` — kept as a thin wrapper so the
 * logging screen doesn't need to know the resolution internals.
 */
export const trackingOf = (ex: any, exerciseLibrary: any[]): string[] =>
  resolveTrackingType(ex, exerciseLibrary);
