// Thin wrappers around programDates that inject the active programme category,
// so call sites in the (very large) Admin page don't each have to pass it.
// Only PT programmes rename sessions to "Day + Date"; all other categories
// keep the AI-generated session name and only store the date.
import { dateAllSessions, dateWeekSessions } from "@/lib/programDates";

export const dateWeekSessionsForCategory = (
  workouts: any[],
  week: number,
  updatedWeekNotes: Record<number, any>,
  category?: string,
) => dateWeekSessions(workouts, week, updatedWeekNotes, category);

export const dateAllSessionsForCategory = (
  workouts: any[],
  weekNotes: Record<number, any>,
  category?: string,
) => dateAllSessions(workouts, weekNotes, category);
