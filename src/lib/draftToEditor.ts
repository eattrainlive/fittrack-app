/**
 * Maps a structured ProgrammeDraft (from the coach-agent "structure" action)
 * into the progWorkouts shape used by the manual programme editor in Admin.tsx.
 *
 * The structured draft shape (from the "structure" action) is:
 *   { name, stream, weeks: [{ week, days: [{ day, minDays, theme,
 *      rows: [{ isSection, name, label, blockType, sets, reps, rest,
 *               eachSide, coachingNotes, sectionType }] }] }] }
 *
 * CRITICAL: each exercise row's `name` field already holds the LIBRARY
 * EXERCISE ID (not the display text). The editor renders exercises by
 * `exercises.find(e => e.id === row.name)`. We pass each row through
 * UNCHANGED — we do NOT overwrite `name` with the label, or the dropdown
 * shows "Select Exercise…" (empty). The `label` is only for display in
 * the preview / for unmatched rows.
 *
 * Each day's minDays is carried onto the app's dayCounts field so the
 * member-facing days-per-week chooser filters agent-built programmes.
 */
export type { ProgrammeDraft } from "./coachAgent";

export interface DraftRow {
  isSection?: boolean;
  name?: string;
  label?: string;
  blockType?: string;
  sectionType?: string;
  sets?: number;
  reps?: string;
  rest?: number;
  eachSide?: boolean;
  linkedToNext?: boolean;
  coachingNotes?: string;
  notes?: string;
}

export interface DraftDay {
  day?: string;
  name?: string;
  minDays?: number;
  theme?: string;
  /** Structured rows (from "structure" action) — pass through unchanged. */
  rows?: DraftRow[];
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

export const draftToEditorWorkouts = (
  draft: { weeks?: DraftWeek[] },
  _library?: any[],
): DraftToEditorResult => {
  const weeks = draft.weeks || [];
  const workouts: any[] = [];
  let dayCounter = 0;
  let unmatchedCount = 0;

  weeks.forEach((week, wi) => {
    const weekNum = week.week || wi + 1;
    (week.days || []).forEach((day, di) => {
      dayCounter += 1;
      const rows = day.rows || [];

      // Pass each row through UNCHANGED — name already holds the library id.
      // Give every row a unique numeric id (the editor keys on this for updates).
      const exercises = rows.map((r: DraftRow, eIdx: number) => {
        // Count unmatched: exercise row (not section) with no library id in name.
        if (!r.isSection && !r.name) unmatchedCount += 1;

        return {
          id: Date.now() + eIdx + Math.random(),
          isSection: r.isSection ?? false,
          name: r.name ?? "", // library id (or "" if unmatched)
          label: r.label,
          sectionType: r.sectionType || "Normal",
          blockType: r.blockType || "Strength",
          trackingType: "Weight & Reps",
          sets: r.sets ?? (r.isSection ? 0 : 3),
          reps: r.reps ?? "",
          rest: r.rest,
          eachSide: r.eachSide ?? false,
          linkedToNext: r.linkedToNext ?? false,
          notes: r.coachingNotes || r.notes || "",
          description: "",
        };
      });

      workouts.push({
        id: `w_${Date.now()}_${dayCounter}`,
        name: day.day || day.name || `Day ${di + 1}`,
        week: weekNum,
        day: di + 1,
        exercises,
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
