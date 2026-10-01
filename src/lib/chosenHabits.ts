import { supabase } from "./supabase";

export interface ChosenHabit {
  id?: string;
  name: string;
  position?: number | null;
  status?: string;
  checkins7d: number;
  totalCheckins: number;
}

/**
 * Fetch a member's chosen habits (member_habits) for the coach review card.
 * Lists active/queued habits (name resolved from the library or the custom
 * habit_name), ordered by position, with a recent (last 7d) check-in rate so
 * the coach can see consistency at a glance.
 *
 * Requires staff read RLS on member_habits + habit_checkins (see
 * supabase/member_habits_staff_read.sql) for the caller to read another
 * member's rows. Self-reads are always allowed.
 */
export const fetchChosenHabits = async (
  userId: string,
): Promise<ChosenHabit[]> => {
  try {
    // 1) the member's active/queued habits
    const { data: mhRows } = await supabase
      .from("member_habits")
      .select("id,member_id,habit_id,habit_name,position,status,frequency")
      .eq("member_id", userId)
      .eq("status", "active")
      .order("position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    // 2) resolve library names in one batch
    const libIds = (mhRows || []).map((r) => r.habit_id).filter(Boolean);
    let libMap: Record<string, any> = {};
    if (libIds.length) {
      const { data: libRows } = await supabase
        .from("habits")
        .select("id,name")
        .in("id", libIds);
      for (const l of libRows || []) libMap[l.id] = l;
    }

    // 3) check-ins for this member (for the recent + total check-in rate)
    let allCheckins: {
      date: string;
      habit_id: string | null;
      member_habit_id: string | null;
    }[] = [];
    try {
      const { data: checkins } = await supabase
        .from("habit_checkins")
        .select("date,habit_id,member_habit_id")
        .eq("member_id", userId);
      allCheckins = (checkins || []).map((c) => ({
        date: (c.date || "").slice(0, 10),
        habit_id: c.habit_id ?? null,
        member_habit_id: c.member_habit_id ?? null,
      }));
    } catch {
      // habit_checkins may not exist yet — ignore
    }

    const last7 = new Date();
    last7.setDate(last7.getDate() - 6);
    const last7Str = last7.toISOString().slice(0, 10);

    return (mhRows || []).map((r) => {
      const lib = r.habit_id ? libMap[r.habit_id] : null;
      const name =
        (lib && lib.name) ||
        r.habit_name ||
        (r.habit_id ? "Habit" : "Custom habit");
      const myChecks = (allCheckins || []).filter(
        (c) =>
          c.member_habit_id === r.id ||
          (r.habit_id && c.habit_id === r.habit_id),
      );
      const last7Checks = myChecks.filter(
        (c) => (c.date || "") >= last7Str,
      ).length;
      return {
        id: r.id,
        name,
        position: r.position ?? null,
        status: r.status || "active",
        checkins7d: last7Checks,
        totalCheckins: myChecks.length,
      };
    });
  } catch {
    // member_habits may not exist yet — soft-fail
    return [];
  }
};
