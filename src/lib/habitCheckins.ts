import { supabase } from "./supabase";
import { logError } from "./errorLog";

const CHECKIN_KEY = "fittrack_habit_checkins";

export const getHabitCheckinsLocal = (): any[] => {
  const local = localStorage.getItem(CHECKIN_KEY);
  return local ? JSON.parse(local) : [];
};

const setLocal = (rows: any[]) =>
  localStorage.setItem(CHECKIN_KEY, JSON.stringify(rows));

/**
 * Log (toggle on) a habit check-in for a given date.
 * Keys on `member_habit_id` (the member_habits row id) so it works for both
 * library habits and custom "create your own" habits. Falls back to `habit_id`
 * for legacy callers.
 */
export const saveHabitCheckin = async (checkin: any) => {
  const date = checkin.date;
  const mhId = checkin.member_habit_id;
  const habitId = checkin.habit_id;

  // Update local cache (optimistic).
  const checkins = getHabitCheckinsLocal();
  const existingIdx = checkins.findIndex(
    (c: any) =>
      c.date === date &&
      ((mhId && c.member_habit_id === mhId) ||
        (!mhId && c.habit_id === habitId)),
  );
  const row = { ...checkin, done: true };
  if (existingIdx >= 0) checkins[existingIdx] = row;
  else checkins.push(row);
  setLocal(checkins);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { error } = await supabase.from("habit_checkins").upsert(
      { ...row, member_id: user.id },
      {
        onConflict: mhId
          ? "member_id, member_habit_id, date"
          : "member_id, habit_id, date",
      },
    );
    if (error) {
      console.error("habit_checkins upsert failed:", error);
      logError("saveHabitCheckin", "habit_checkins", error);
    }
    return { success: !error, error };
  }
  return { success: true };
};

/**
 * Un-log (toggle off) today's check-in for a habit.
 */
export const deleteHabitCheckin = async (checkin: any) => {
  const date = checkin.date;
  const mhId = checkin.member_habit_id;
  const habitId = checkin.habit_id;

  setLocal(
    getHabitCheckinsLocal().filter(
      (c: any) =>
        !(
          c.date === date &&
          ((mhId && c.member_habit_id === mhId) ||
            (!mhId && c.habit_id === habitId))
        ),
    ),
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    let q = supabase
      .from("habit_checkins")
      .delete()
      .eq("member_id", user.id)
      .eq("date", date);
    if (mhId) q = q.eq("member_habit_id", mhId);
    else q = q.eq("habit_id", habitId);
    const { error } = await q;
    if (error) {
      console.error("habit_checkins delete failed:", error);
      logError("deleteHabitCheckin", "habit_checkins", error);
    }
    return { success: !error, error };
  }
  return { success: true };
};
