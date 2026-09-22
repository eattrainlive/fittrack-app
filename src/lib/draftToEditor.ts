/**
 * Maps a structured ProgrammeDraft (from the coach-agent "structure" action)
 * into the progWorkouts shape used by the manual programme editor in Admin.tsx.
 *
 * The structured draft shape is:
 *   { name, stream, weeks: [{ week, days: [{ day, minDays, theme,
 *      sections: [{ name, exercises: [{ name, exercise_id, sets, reps, notes }] }] }] }] }
 *
 * Exercises resolve to the library by exercise_id first, then by name.
 * Anything that doesn't match is flagged for the coach. Each day's minDays
 * is carried onto the app's dayCounts field so the member-facing days-per-week
 * chooser filters agent-built programmes correctly.
 */
import { mapProgramExercise } from "./programExerciseMapper";
export type { ProgrammeDraft } from "./coachAgent";

export interface DraftExercise {
  id?: string;
  exercise_id?: string;
  name?: string;
  sets?: number;
  reps?: string;
  notes?: string;
  isSection?: boolean;
  sectionType?: string;
}

export interface DraftSection {
  name?: string;
  exercises?: DraftExercise[];
}

export interface DraftDay {
  day?: string;
  name?: string;
  minDays?: number;
  theme?: string;
  /** Nested sections (structured draft from "structure" action). */
  sections?: DraftSection[];
  /** Flat exercises (older draft shape — fallback). */
  exercises?: DraftExercise[];
  /** Explicit per-session day filter (overrides minDays if present). */
  dayCounts?: number[];
}

export interface DraftWeek {
  week?: number;
  label?: string;
  days?: DraftDay[];
}

export interface DraftToEditorResult {
  workouts: any[];
  unmatchedCount: number;
  weekCount: number;
  daysInFirstWeek: number;
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

/** Flatten a day's sections into the editor's exercises array, inserting
 *  section-header rows so the editor preserves the section structure. */
const flattenDay = (day: DraftDay): DraftExercise[] => {
  if (day.sections && day.sections.length) {
    const out: DraftExercise[] = [];
    for (const sec of day.sections) {
      out.push({
        isSection: true,
        name: sec.name || "Section",
        sectionType: "Normal",
      });
      for (const ex of sec.exercises || []) {
        out.push({ ...ex, isSection: false });
      }
    }
    return out;
  }
  // Fallback: flat exercises array (older draft shape)
  return day.exercises || [];
};

export const draftToEditorWorkouts = (
  draft: { weeks?: DraftWeek[] },
  library: any[],
): DraftToEditorResult => {
  const weeks = draft.weeks || [];
  const workouts: any[] = [];
  let dayCounter = 0;
  let unmatchedCount = 0;

  weeks.forEach((week, wi) => {
    const weekNum = week.week || wi + 1;
    (week.days || []).forEach((day, di) => {
      dayCounter += 1;
      const rawExercises = flattenDay(day);
      const mappedExercises = rawExercises.map((ex: any, eIdx: number) => {
        // Section header rows pass straight through (no library match needed).
        if (ex.isSection) {
          return {
            id: Date.now() + eIdx + Math.random(),
            isSection: true,
            name: ex.name || "Section",
            sectionType: ex.sectionType || "Normal",
            description: "",
            blockType: "Strength",
            trackingType: "Weight & Reps",
            sets: 0,
            reps: "",
            notes: "",
          };
        }

        // Resolve by exercise_id first, then by name.
        const libMatch =
          (ex.exercise_id &&
            library.find((e) => String(e.id) === String(ex.exercise_id))) ||
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
          isSection: false,
          sectionType: "Normal",
        };
      });

      workouts.push({
        id: `w_${Date.now()}_${dayCounter}`,
        name: day.day || day.name || `Day ${di + 1}`,
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
