/**
 * Maps a programme exercise object into the shape persisted to the `programs`
 * table (and used by the member app). Centralised here so every save path
 * (WOW, autoSaveProgram, assign-to-member, etc.) copies the same fields —
 * including section fields like `timeCapMins` and `targetNote` that used to be
 * dropped by individual mappings.
 *
 * `trackingOverride` lets callers pass a resolved tracking type (e.g. from
 * `resolveTrackingType`); when omitted the exercise's own `trackingType` is
 * used.
 */
export const mapProgramExercise = (e: any, trackingOverride?: any) => ({
  isSection: e.isSection,
  sectionType: e.sectionType || "Normal",
  timeCapMins: e.timeCapMins ?? null,
  targetNote: e.targetNote ?? null,
  description: e.description,
  blockType: e.blockType || "Strength",
  name: e.name,
  sets: e.sets,
  reps: e.reps,
  weight: e.weight,
  distance: e.distance,
  timeMins: e.timeMins,
  timeSecs: e.timeSecs,
  rest: e.rest ?? 0,
  linkedToNext: e.linkedToNext,
  eachSide: e.eachSide,
  staffNotes: e.staffNotes,
  coachingNotes: e.coachingNotes,
  trackingType: trackingOverride ?? e.trackingType,
});
