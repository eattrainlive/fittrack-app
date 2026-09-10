// Group PT round-linking helpers.
// A 12-week Group PT block shares a base template over 3 rounds:
//   base week 1 -> weeks 1, 5, 9
//   base week 2 -> weeks 2, 6, 10
//   base week 3 -> weeks 3, 7, 11
//   base week 4 -> weeks 4, 8, 12
// Editing an exercise in one session ripples the EXERCISE IDENTITY (movement) to the
// sibling round-weeks at the same day + slot, but preserves each round's own
// sets/reps/rest/weight (the rounds progress: R1 base -> R2 heavier -> R3 heaviest).

export const baseWeekOf = (week: number): number =>
  ((Number(week) - 1) % 4) + 1;

// The three round-weeks that share a base week, within 12. e.g. week 5 -> [1,5,9]
export const roundSiblingWeeks = (week: number): number[] => {
  const b = ((Number(week) - 1) % 4) + 1;
  return [b, b + 4, b + 8];
};

// The sibling weeks EXCLUDING the changed week itself.
export const otherRoundWeeks = (week: number): number[] =>
  roundSiblingWeeks(week).filter((w) => w !== Number(week));

export interface ExerciseFields {
  name?: string;
  trackingType?: any;
  eachSide?: boolean;
  blockType?: string;
  isSection?: boolean;
}

/**
 * Propagate an exercise change across the sibling round-weeks of a Group PT block.
 * Copies the exercise IDENTITY fields (name/trackingType/eachSide/blockType) to the
 * matching day + slot in the sibling sessions, preserving each round's own
 * sets/reps/rest/weight/distance/time.
 *
 * @param workouts  the full workouts array (will be cloned, not mutated)
 * @param changedWeek  the week of the session that changed
 * @param changedDay   the day of the session that changed
 * @param exIndex      the index of the changed exercise within its session's exercises array
 * @param fields       the identity fields to copy across
 * @returns a new workouts array with siblings updated
 */
export const propagateAcrossRounds = (
  workouts: any[],
  changedWeek: number,
  changedDay: number,
  exIndex: number,
  fields: ExerciseFields,
): any[] => {
  const siblings = otherRoundWeeks(changedWeek);
  if (!siblings.length) return workouts;
  return workouts.map((w: any) => {
    if (
      !siblings.includes(Number(w.week)) ||
      Number(w.day) !== Number(changedDay)
    )
      return w;
    const exs = Array.isArray(w.exercises) ? [...w.exercises] : [];
    if (exs[exIndex] && !exs[exIndex].isSection) {
      exs[exIndex] = {
        ...exs[exIndex], // keep this round's sets/reps/rest/weight/distance/time
        ...fields, // overwrite identity only
      };
    }
    return { ...w, exercises: exs };
  });
};

/**
 * Propagate a whole-session set of exercise changes (e.g. after Shuffle All or
 * regenerate) across sibling round-weeks. Copies identity fields for every
 * non-section exercise at each index, preserving each round's loading.
 */
export const propagateSessionAcrossRounds = (
  workouts: any[],
  changedWeek: number,
  changedDay: number,
  sourceExercises: any[],
): any[] => {
  const siblings = otherRoundWeeks(changedWeek);
  if (!siblings.length) return workouts;
  return workouts.map((w: any) => {
    if (
      !siblings.includes(Number(w.week)) ||
      Number(w.day) !== Number(changedDay)
    )
      return w;
    const exs = Array.isArray(w.exercises) ? [...w.exercises] : [];
    sourceExercises.forEach((src: any, i: number) => {
      if (src.isSection) return;
      if (exs[i] && !exs[i].isSection) {
        exs[i] = {
          ...exs[i],
          name: src.name,
          trackingType: src.trackingType,
          eachSide: src.eachSide,
          blockType: src.blockType,
        };
      }
    });
    return { ...w, exercises: exs };
  });
};
