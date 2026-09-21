/**
 * Maps a ProgrammeDraft (from the AI Coach chat) into the progWorkouts shape
 * used by the manual programme editor in Admin.tsx.
 *
 * Extracted into its own module so Admin.tsx doesn't grow further. The caller
 * passes the loaded exercise library so exercises resolve to real library rows
 * (by id or name); anything that doesn't match is flagged for the coach.
 */
import { mapProgramExercise } from "./programExerciseMapper";
export type { ProgrammeDraft } from "./coachAgent";

export interface DraftExercise {
  id?: string;
  name?: string;
  sets?: number;
  reps?: string;
  notes?: string;
  isSection?: boolean;
  sectionType?: string;
}

export interface DraftDay {
  name?: string;
  exercises?: DraftExercise[];
  sections?: DraftExercise[];
  /** Minimum days-per-week a member must train to see this session (agent-authored). */
  minDays?: number;
  /** Explicit per-session day filter (overrides minDays if present). */
  dayCounts?: number[];
}

/**
 * Convert a session's `minDays` into the `dayCounts` array the member-facing
 * app filters on. A session authored at minDays=2 shows for members training
 * 2,3,4 or 5 days/week. The agent always authors all 5 sessions tagged by
 * minDays; the member sees the ones where dayCounts includes their chosen days.
 */
const dayCountsFromMinDays = (minDays: number | undefined): number[] => {
  if (!minDays || minDays < 1) return [1, 2, 3, 4, 5];
  const arr: number[] = [];
  for (let d = minDays; d <= 5; d++) arr.push(d);
  return arr.length ? arr : [1, 2, 3, 4, 5];
};

export interface DraftWeek {
  label?: string;
  days?: DraftDay[];
}

export interface DraftToEditorResult {
  workouts: any[];
  unmatchedCount: number;
  weekCount: number;
  daysInFirstWeek: number;
}

export const draftToEditorWorkouts = (
  draft: { weeks?: DraftWeek[] },
  library: any[],
): DraftToEditorResult => {
  const weeks = draft.weeks || [];
  const workouts: any[] = [];
  let dayCounter = 0;
  let unmatchedCount = 0;

  weeks.forEach((week, wi) => {
    const weekNum = wi + 1;
    (week.days || []).forEach((day, di) => {
      dayCounter += 1;
      const rawExercises = day.exercises || day.sections || [];
      const mappedExercises = rawExercises.map((ex: any, eIdx: number) => {
        const libMatch =
          (ex.id && library.find((e) => String(e.id) === String(ex.id))) ||
          library.find((e) => e.name === ex.name);

        if (!libMatch) unmatchedCount += 1;

        const base: any = libMatch
          ? mapProgramExercise(libMatch, libMatch.trackingType)
          : {
              name: ex.name || "Unknown exercise",
              trackingType: "Weight & Reps",
              sets: 3,
              reps: "10",
            };

        return {
          id: Date.now() + eIdx + Math.random(),
          ...base,
          name: ex.name || base.name,
          sets: ex.sets != null ? Number(ex.sets) : (base.sets ?? 3),
          reps: ex.reps ?? base.reps ?? "10",
          notes: ex.notes || "",
          isSection: ex.isSection || false,
          sectionType: ex.sectionType || "Normal",
        };
      });

      workouts.push({
        id: `w_${Date.now()}_${dayCounter}`,
        name: day.name || `Day ${di + 1}`,
        week: weekNum,
        day: di + 1,
        exercises: mappedExercises,
        minDays: day.minDays ?? undefined,
        dayCounts: day.dayCounts ?? dayCountsFromMinDays(day.minDays),
      });
    });
  });

  return {
    workouts,
    unmatchedCount,
    weekCount: Math.max(1, weeks.length),
    daysInFirstWeek: Math.max(
      1,
      weeks[0]?.days?.length ||
        workouts.filter((w) => w.week === 1).length ||
        1,
    ),
  };
};
