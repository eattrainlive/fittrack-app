import { REWARD_ITEMS } from "./workoutConstants";
import { exercisesForSave } from "./pickOneFilter";
import { skippedExerciseIds } from "./workoutSkip";

/**
 * Pure helpers for the workout-save path. Extracted from Workouts.tsx.
 */

/**
 * Compute the exercises to persist: pickOne-filtered, with conditioning
 * results attached, and with explicitly-skipped sections removed.
 */
export function buildSavedExercises(
  exercises: any[],
  pickOneChoices: Record<string, number | null>,
  skippedSectionIds: Set<string | number>,
  conditioningResults: Record<string, any>,
): any[] {
  const savedExercises = exercisesForSave(exercises, pickOneChoices);

  // Drop exercises that belong to explicitly-skipped sections.
  const skipIds = skippedExerciseIds(exercises, skippedSectionIds);
  const filtered = savedExercises.filter((ex) => !skipIds.has(ex.id));

  // Attach conditioning scores to their section objects before saving.
  return filtered.map((ex: any) => {
    if (!ex.isSection) return ex;
    const sectionId = ex.id;
    const result = sectionId ? conditioningResults[sectionId] : undefined;
    return result ? { ...ex, result } : ex;
  });
}

/**
 * Sum volume (weight × reps × eachSide) over completed sets.
 */
export function computeTotalVolume(savedExercises: any[]): number {
  return savedExercises.reduce((acc, ex) => {
    if (ex.isSection || !ex.setsData) return acc;
    const completedSets = ex.setsData.filter((s: any) => s.completed);
    const setsToCount = completedSets.length > 0 ? completedSets : ex.setsData;
    return (
      acc +
      setsToCount.reduce(
        (setAcc: number, set: any) =>
          setAcc + (set.reps || 0) * (ex.eachSide ? 2 : 1) * (set.weight || 0),
        0,
      )
    );
  }, 0);
}

/**
 * Pick a random earned reward based on total volume, or null if none.
 */
export function computeEarnedReward(totalVolume: number): any {
  const possibleRewards = REWARD_ITEMS.filter(
    (item) => totalVolume >= item.weight,
  );
  if (possibleRewards.length === 0) return null;
  const randomItem =
    possibleRewards[Math.floor(Math.random() * possibleRewards.length)];
  const count = Math.floor(totalVolume / randomItem.weight);
  return {
    name: randomItem.name,
    emoji: randomItem.emoji,
    count: count,
    displayName:
      count === 1
        ? randomItem.name
        : randomItem.plural || randomItem.name + "s",
  };
}
