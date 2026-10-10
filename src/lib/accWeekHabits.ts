import { supabase } from "./supabase";

export interface AccWeekHabit {
  habit_id: number;
  week_number: number;
  sort: number;
  name: string;
}

/**
 * Read the programme habit stack unlocked so far (with names), in sort order.
 * Joins acc_week_habits -> habits for the name so programme-only habits
 * (active=false, hidden from member pickers) still resolve their name.
 */
export const getAccWeekHabits = async (
  currentWeek: number,
): Promise<AccWeekHabit[]> => {
  try {
    const { data } = await supabase
      .from("acc_week_habits")
      .select("week_number, habit_id, sort, habits(name)")
      .lte("week_number", currentWeek)
      .order("sort", { ascending: true });
    return ((data as any[]) || [])
      .filter((r) => r.habit_id != null)
      .map((r) => ({
        habit_id: Number(r.habit_id),
        week_number: Number(r.week_number),
        sort: Number(r.sort ?? 0),
        name: String(r.habits?.name ?? r.habit_name ?? `Habit ${r.habit_id}`),
      }));
  } catch {
    return [];
  }
};

/** Ordered list of habit ids unlocked so far. */
export const getAccWeekHabitIds = async (
  currentWeek: number,
): Promise<number[]> => {
  const stack = await getAccWeekHabits(currentWeek);
  return stack.map((s) => s.habit_id);
};

/**
 * Ensure the member's member_habits rows exist for every programme habit
 * unlocked so far. Idempotent — safe every load. Never removes/graduates.
 *
 * Uses the proven member_habits contract (member_id, habit_id, habit_name,
 * status, position, started_at) with onConflict on (member_id, habit_id).
 */
export const ensureAccHabitsUnlocked = async (
  currentWeek: number,
): Promise<void> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const uid = user.id;

    const [stack, { data: existing }] = await Promise.all([
      getAccWeekHabits(currentWeek),
      supabase
        .from("member_habits")
        .select("id, habit_id")
        .eq("member_id", uid),
    ]);

    const have = new Set(
      ((existing as any[]) || []).map((r) => Number(r.habit_id)),
    );

    for (const h of stack) {
      if (have.has(h.habit_id)) continue;
      await supabase.from("member_habits").upsert(
        {
          member_id: uid,
          habit_id: h.habit_id,
          habit_name: h.name,
          status: "active",
          position: h.sort,
          started_at: new Date().toISOString(),
        },
        { onConflict: "member_id, habit_id" },
      );
    }
  } catch {
    /* best-effort */
  }
};
