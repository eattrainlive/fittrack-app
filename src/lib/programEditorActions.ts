/**
 * Programme editor week/day/repeat helpers.
 *
 * Pure functions that operate on the progWorkouts array + progWeekNotes shape
 * used by the Admin programme editor. Extracted so Admin.tsx stays manageable.
 */
import { addDaysISO } from "@/lib/programDates";

export interface ProgWorkout {
  id: string | number;
  name?: string;
  week?: number;
  day?: number;
  exercises: any[];
  date?: string;
  dayCounts?: number[];
  minDays?: number;
  [key: string]: any;
}

export interface WeekNotes {
  [week: number]: { label?: string; start_date?: string; [k: string]: any };
}

/** Number of days rendered for a given programme type/stream. */
export const daysForType = (
  type: string,
  stream: string,
  days: number,
): number => (type === "program" ? (stream === "Stronger" ? 7 : 5) : days);

/** The highest week number currently present in progWorkouts. */
export const maxWeekIn = (workouts: ProgWorkout[]): number =>
  workouts.reduce((m, w) => Math.max(m, Number(w.week) || 0), 0);

/** Build an empty workout row for a week×day slot. */
const emptyRow = (
  week: number,
  day: number,
  week1Start?: string | null,
): ProgWorkout => {
  const start = week1Start ? addDaysISO(week1Start, (week - 1) * 7) : undefined;
  return {
    id: `w_${Date.now()}_${week}_${day}_${Math.random().toString(36).slice(2, 6)}`,
    name: `Day ${day}`,
    week,
    day,
    exercises: [],
    date: start,
    dayCounts: [day],
  };
};

/**
 * Add a new empty week to the end.
 * Returns the new workouts array, the new week number, and the new total count.
 */
export const addWeek = (
  workouts: ProgWorkout[],
  days: number,
  weekNotes: WeekNotes,
  currentWeekCount: number,
): {
  workouts: ProgWorkout[];
  newWeek: number;
  newWeekCount: number;
} => {
  const base = maxWeekIn(workouts);
  const newWeek = (base || currentWeekCount) + 1;
  const week1Start = weekNotes[1]?.start_date || null;
  const updated = [...workouts];
  for (let d = 1; d <= days; d++) {
    updated.push(emptyRow(newWeek, d, week1Start));
  }
  return {
    workouts: updated,
    newWeek,
    newWeekCount: Math.max(currentWeekCount, newWeek),
  };
};

/**
 * Add a new day across all existing weeks.
 * Returns the new workouts array and the new day number.
 */
export const addDay = (
  workouts: ProgWorkout[],
  currentDayCount: number,
): {
  workouts: ProgWorkout[];
  newDay: number;
} => {
  const newDay = Math.min(7, currentDayCount + 1);
  if (newDay === currentDayCount) {
    // already at cap
    return { workouts, newDay: currentDayCount };
  }
  const weeks = new Set(workouts.map((w) => Number(w.week)).filter(Boolean));
  const updated = [...workouts];
  for (const w of weeks) {
    updated.push(emptyRow(w, newDay));
  }
  return { workouts: updated, newDay };
};

/**
 * Repeat the built block forward to N weeks (exact copy, wrapping).
 * e.g. a 4-week block → repeatTo 12 fills weeks 5–8 and 9–12 as copies of 1–4.
 *
 * Only writes into weeks beyond the current block (B+1..N); existing weeks
 * beyond B that already have content are left untouched unless `overwrite`
 * is true.
 */
export const repeatBlockTo = (
  workouts: ProgWorkout[],
  target: number,
  days: number,
  weekNotes: WeekNotes,
  currentWeekCount: number,
  overwrite = false,
): {
  workouts: ProgWorkout[];
  newWeekCount: number;
  blockLen: number;
  toast: string | null;
} => {
  const B = maxWeekIn(workouts);
  if (B === 0) {
    return {
      workouts,
      newWeekCount: currentWeekCount,
      blockLen: 0,
      toast: "Build at least one week first",
    };
  }
  if (target <= B) {
    return {
      workouts,
      newWeekCount: currentWeekCount,
      blockLen: B,
      toast: null,
    };
  }

  const updated = [...workouts];
  const week1Start = weekNotes[1]?.start_date || null;

  // Ensure empty rows exist for every week×day up to target (seeding gaps).
  for (let w = B + 1; w <= target; w++) {
    for (let d = 1; d <= days; d++) {
      const exists = updated.some(
        (row) => Number(row.week) === w && Number(row.day) === d,
      );
      if (!exists) updated.push(emptyRow(w, d, week1Start));
    }
  }

  // Copy source week's days into each target week (wrapping the block).
  for (let t = B + 1; t <= target; t++) {
    const sourceWeek = ((t - 1) % B) + 1;

    // Skip if target week already has real content and we're not overwriting.
    if (!overwrite) {
      const hasContent = updated.some(
        (row) =>
          Number(row.week) === t && row.exercises && row.exercises.length > 0,
      );
      if (hasContent) continue;
    }

    for (let d = 1; d <= days; d++) {
      const sourceIdx = updated.findIndex(
        (row) => Number(row.week) === sourceWeek && Number(row.day) === d,
      );
      const targetIdx = updated.findIndex(
        (row) => Number(row.week) === t && Number(row.day) === d,
      );
      if (sourceIdx < 0 || targetIdx < 0) continue;

      const sourceExercises = JSON.parse(
        JSON.stringify(updated[sourceIdx].exercises || []),
      ).map((e: any) => ({ ...e, id: Date.now() + Math.random() }));

      updated[targetIdx] = {
        ...updated[targetIdx],
        exercises: sourceExercises,
        dayCounts: updated[sourceIdx].dayCounts
          ? [...updated[sourceIdx].dayCounts]
          : updated[targetIdx].dayCounts,
      };
    }
  }

  return {
    workouts: updated,
    newWeekCount: target,
    blockLen: B,
    toast: `Repeated weeks 1–${B} across ${target} weeks`,
  };
};
