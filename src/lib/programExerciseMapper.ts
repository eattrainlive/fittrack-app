/**
 * Maps a programme exercise object into the shape persisted to the `programs`
 * table (and used by the member app). Centralised here so every save path
 * (WOW, autoSaveProgram, assign-to-member, etc.) copies the same fields —
 * including section fields like `timeCapMins` and `targetNote` that used to be
 * dropped by individual mappings.
 *
 * `trackingOverride` lets callers pass a resolved tracking type (e.g. from
 * `resolveTrackingType`); when omitted the exercise's own `trackingType` is
 * used. In both cases, `syncTrackingWithValues` is applied so the stored type
 * matches the prescription values (a 30s hold → "Time Only", not "1×10").
 */
import { syncTrackingWithValues } from "@/lib/tracking";

export const mapProgramExercise = (e: any, trackingOverride?: any) => ({
  isSection: e.isSection,
  sectionType: e.sectionType || "Normal",
  timeCapMins: e.timeCapMins ?? null,
  targetNote: e.targetNote ?? null,
  pickOne: e.pickOne ?? false,
  description: e.description,
  blockType: e.blockType || "Strength",
  name: e.name,
  sets: e.sets,
  reps: e.reps,
  weight: e.weight,
  distance: e.distance,
  timeMins: e.timeMins,
  timeSecs: e.timeSecs,
  calories: e.calories,
  rest: e.rest ?? 0,
  linkedToNext: e.linkedToNext,
  eachSide: e.eachSide,
  reference: e.reference ?? false,
  staffNotes: e.staffNotes,
  coachingNotes: e.coachingNotes,
  trackingType: syncTrackingWithValues({
    ...e,
    trackingType: trackingOverride ?? e.trackingType,
  }),
});
