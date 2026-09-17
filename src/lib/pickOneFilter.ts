import { sectionOptions } from "./pickOne";

/**
 * Returns the set of exercise ids that should be EXCLUDED from saving /
 * completion because they belong to an un-chosen option of a `pickOne` section.
 *
 * `exercises` = the full flat session array (sections + exercises).
 * `choices` = map of sectionId -> chosen option index (0-based), or null/absent
 *             if no choice made yet.
 */
export function excludedPickOneIds(
  exercises: any[],
  choices: Record<string, number | null>,
): Set<string | number> {
  const excluded = new Set<string | number>();
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    if (!ex.isSection || !ex.pickOne) continue;
    // gather this section's exercises
    const sectionExercises: any[] = [];
    for (let j = i + 1; j < exercises.length; j++) {
      if (exercises[j].isSection) break;
      sectionExercises.push(exercises[j]);
    }
    const options = sectionOptions(sectionExercises);
    const chosen = choices[ex.id];
    // If no choice made, exclude nothing (they haven't started the finisher).
    if (chosen == null || chosen < 0 || chosen >= options.length) continue;
    // exclude every option that isn't the chosen one
    options.forEach((opt, oi) => {
      if (oi === chosen) return;
      opt.exerciseIds.forEach((id) => excluded.add(id));
    });
  }
  return excluded;
}

/**
 * Filter the exercises array to only those that should be saved to history /
 * considered for PBs: drops section headers that are pickOne (they're just
 * organisers) and drops un-chosen option exercises.
 */
export function exercisesForSave(
  exercises: any[],
  choices: Record<string, number | null>,
): any[] {
  const excluded = excludedPickOneIds(exercises, choices);
  return exercises.filter((ex) => {
    if (ex.isSection && ex.pickOne) return false; // drop the pickOne organiser header
    if (excluded.has(ex.id)) return false;
    return true;
  });
}
