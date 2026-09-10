import { supabase } from "./supabase";
import {
  getHabits,
  saveBodyweight,
  saveMemberHabits,
  saveMemberMacros,
} from "./store";

// ── Member goals (retention foundation — same shape as trial goals, + focus/review_due) ──
// One row per member in `member_goals` (keyed on auth uid). The progress pack
// reads this so the member sees live progress-vs-targets on a rolling 90-day window.

export type PrimaryGoal = "fat_loss" | "strength" | "fitness" | "health";

export interface MemberGoals {
  start_weight?: number | null;
  focus?: string | null;
  step_target?: number | null;
  sessions_per_week?: number | null;
  calorie_target?: number | null;
  habit_1?: string | null;
  habit_2?: string | null;
  habit_3?: string | null;
  review_due?: string | null;
  set_at?: string | null;
  // Extended retention fields:
  primary_goal?: string | null;
  goal_text?: string | null;
  target_weight?: number | null;
  target_date?: string | null;
  focus_areas?: string[] | null;
}

const asInt = (v: any) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

const addDaysISO = (iso: string, n: number) => {
  const [y, m, d] = (iso || "").slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d + n);
  if (isNaN(dt.getTime())) return iso;
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

export const getMemberGoals = async (): Promise<MemberGoals | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("member_goals")
    .select(
      "start_weight,focus,step_target,sessions_per_week,calorie_target,habit_1,habit_2,habit_3,review_due,set_at,primary_goal,goal_text,target_weight,target_date,focus_areas",
    )
    .eq("member_id", user.id)
    .maybeSingle();
  return data as MemberGoals | null;
};

export const saveMemberGoals = async (input: {
  startWeight?: number | null;
  focus?: string | null;
  stepTarget?: number | null;
  sessionsPerWeek?: number | null;
  calorieTarget?: number | null;
  habitTexts?: (string | null)[];
  reviewDue?: string | null;
  primaryGoal?: string | null;
  goalText?: string | null;
  targetWeight?: number | null;
  targetDate?: string | null;
  focusAreas?: string[] | null;
}): Promise<MemberGoals | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Each habit slot stores the readable NAME (library habit) or a custom string.
  const habitTexts = (input.habitTexts || [])
    .slice(0, 3)
    .map((h) => (h ?? "").trim() || null);
  while (habitTexts.length < 3) habitTexts.push(null);

  const now = new Date().toISOString();
  const reviewDue = input.reviewDue || addDaysISO(now.split("T")[0], 90);

  const row: MemberGoals & { member_id: string; set_at: string } = {
    member_id: user.id,
    start_weight: input.startWeight ?? null,
    focus: input.focus ?? null,
    step_target: input.stepTarget ?? null,
    sessions_per_week: input.sessionsPerWeek ?? null,
    calorie_target: input.calorieTarget ?? null,
    habit_1: habitTexts[0] ?? null,
    habit_2: habitTexts[1] ?? null,
    habit_3: habitTexts[2] ?? null,
    review_due: reviewDue,
    set_at: now,
    primary_goal: input.primaryGoal ?? null,
    goal_text: input.goalText ?? null,
    target_weight: input.targetWeight ?? null,
    target_date: input.targetDate || null,
    focus_areas:
      input.focusAreas && input.focusAreas.length ? input.focusAreas : null,
  };

  const { data, error } = await supabase
    .from("member_goals")
    .upsert(row, { onConflict: "member_id" })
    .select(
      "start_weight,focus,step_target,sessions_per_week,calorie_target,habit_1,habit_2,habit_3,review_due,set_at,primary_goal,goal_text,target_weight,target_date,focus_areas",
    )
    .maybeSingle();

  if (error) throw error;

  // Side-effects (best-effort; never block the goals save on these).
  try {
    if (input.startWeight && input.startWeight > 0) {
      await saveBodyweight({ weight: input.startWeight });
    }
  } catch {
    /* ignore */
  }
  try {
    if (input.calorieTarget && input.calorieTarget > 0) {
      await saveMemberMacros({ calorie_target: input.calorieTarget });
    }
  } catch {
    /* ignore */
  }
  // Seed the chosen habits into member_habits so the habit tracker/streaks
  // work against them. Resolve each habit text back to a library id where
  // possible (custom-typed habits have no library id, so skip seeding those).
  try {
    const lib = await getHabits();
    const nameToId = new Map<string, number>();
    for (const h of lib || []) {
      if (h?.id != null)
        nameToId.set(
          String(h.name || "")
            .toLowerCase()
            .trim(),
          Number(h.id),
        );
    }
    const validIds: number[] = [];
    for (const t of habitTexts) {
      if (!t) continue;
      const id = nameToId.get(t.toLowerCase().trim());
      if (id != null) validIds.push(id);
    }
    if (validIds.length) {
      await saveMemberHabits(
        validIds.map((habitId, i) => ({
          habit_id: habitId,
          status: i === 0 ? "active" : "queued",
          position: i,
          started_at: i === 0 ? new Date().toISOString() : null,
        })),
      );
    }
  } catch {
    /* ignore */
  }

  return data as MemberGoals | null;
};

export const getHabitLibrary = async () => {
  try {
    return await getHabits();
  } catch {
    return [];
  }
};
export { saveMemberMacros, asInt };
