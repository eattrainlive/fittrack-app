/**
 * "Pick one" finisher support.
 *
 * A section flagged `pickOne: true` offers the member a choice between its
 * superset groups (runs of `linkedToNext` exercises). The member logs only the
 * chosen option; the others are treated as skipped (never block completion and
 * are not saved to history).
 */

export type PickOption = {
  /** Index of the first exercise in this option (within the section's exercises). */
  startIndex: number;
  /** The exercise ids that make up this option. */
  exerciseIds: (string | number)[];
  /** A readable label (first exercise name, or "Option A/B"). */
  label: string;
};

const LETTERS = "ABCDEFGH";

/**
 * Split a section's exercises into selectable options.
 * An option = a run of consecutive exercises where the first has
 * `linkedToNext: true` (a superset), OR a single exercise with
 * `linkedToNext: false` (a standalone option).
 */
export function sectionOptions(sectionExercises: any[]): PickOption[] {
  const options: PickOption[] = [];
  let i = 0;
  while (i < sectionExercises.length) {
    const ex = sectionExercises[i];
    const ids: (string | number)[] = [ex.id];
    let j = i + 1;
    // gather the superset run
    while (
      j < sectionExercises.length &&
      sectionExercises[j - 1].linkedToNext
    ) {
      ids.push(sectionExercises[j].id);
      j++;
    }
    options.push({
      startIndex: i,
      exerciseIds: ids,
      label: `Option ${LETTERS[options.length] ?? options.length + 1}`,
    });
    i = j;
  }
  return options;
}

/**
 * Given the full flat `exercises` array and a section exercise, return the
 * exercises that belong to that section (between this section header and the
 * next section header).
 */
export function exercisesInSection(exercises: any[], section: any): any[] {
  const idx = exercises.findIndex((e) => e.id === section.id);
  if (idx === -1) return [];
  const out: any[] = [];
  for (let i = idx + 1; i < exercises.length; i++) {
    if (exercises[i].isSection) break;
    out.push(exercises[i]);
  }
  return out;
}
