import { supabase } from "./supabase";

/**
 * A member's habit check-off adherence over the last N days — for the coach's
 * activity card (and to drive outreach prompts: "back on your habits" vs "great
 * streak"). Staff-read: member_habits + habit_checkins are keyed by the member's
 * app user id. Soft-fails to [] so it never breaks the modal.
 */
export interface HabitAdherence {
  id: string;
  name: string;
  done: number; // distinct days checked in the window
  of: number; // window length (days)
}

const dayStr = (d: Date) => d.toISOString().slice(0, 10);

export async function getHabitAdherence(
  userId: string,
  days = 7,
): Promise<HabitAdherence[]> {
  if (!userId) return [];
  try {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    const sinceStr = dayStr(since);

    const [{ data: mh }, { data: hc }] = await Promise.all([
      supabase
        .from("member_habits")
        .select("id, habit_id, habit_name, position")
        .eq("member_id", userId)
        .eq("status", "active")
        .order("position", { ascending: true }),
      supabase
        .from("habit_checkins")
        .select("date, habit_id, member_habit_id")
        .eq("member_id", userId)
        .gte("date", sinceStr),
    ]);

    const habits = (mh ?? []) as any[];
    const checks = (hc ?? []) as any[];

    return habits
      .filter((h) => (h.habit_name ?? "").trim())
      .map((h) => {
        const dates = new Set<string>();
        for (const c of checks) {
          const match =
            (c.member_habit_id != null && c.member_habit_id === h.id) ||
            (h.habit_id != null && c.habit_id === h.habit_id);
          if (match && c.date) dates.add(String(c.date).slice(0, 10));
        }
        return { id: h.id, name: h.habit_name, done: dates.size, of: days };
      });
  } catch (e) {
    console.warn("getHabitAdherence failed", e);
    return [];
  }
}
