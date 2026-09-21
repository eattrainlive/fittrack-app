/**
 * Builds a row safe for upsert to the `exercises` table — whitelisting only
 * the columns that exist, and persisting the structured tags
 * (movement_pattern, movement_family, role, unilateral, is_compound,
 * primary_muscles, contraindications) alongside the legacy fields.
 *
 * Extracted from store.ts so the structured-tag additions don't expand an
 * already-large file.
 */
export const buildSafeExerciseRow = (e: any, userId: string): any => {
  const cleaned: any = {
    id: e.id,
    name: e.name,
    user_id: userId,
    muscle: e.muscle ?? null,
    equipment: e.equipment ?? null,
    difficulty: e.difficulty ?? null,
    videoUrl: e.videoUrl ?? null,
  };
  // category and movementType/trackingType are stored as comma-joined strings
  cleaned.category = Array.isArray(e.category)
    ? e.category.join(", ")
    : (e.category ?? null);
  cleaned.movementType = Array.isArray(e.movementType)
    ? e.movementType.join(", ")
    : (e.movementType ?? null);
  cleaned.trackingType = Array.isArray(e.trackingType)
    ? e.trackingType.join(", ")
    : (e.trackingType ?? "Weight & Reps");
  // Structured tags (may be null on older rows — that's fine).
  cleaned.movement_pattern = e.movement_pattern ?? null;
  cleaned.movement_family = e.movement_family ?? null;
  cleaned.role = e.role ?? null;
  cleaned.unilateral = e.unilateral ?? null;
  cleaned.is_compound = e.is_compound ?? null;
  cleaned.primary_muscles = Array.isArray(e.primary_muscles)
    ? e.primary_muscles
    : null;
  cleaned.contraindications = Array.isArray(e.contraindications)
    ? e.contraindications
    : null;
  return cleaned;
};
