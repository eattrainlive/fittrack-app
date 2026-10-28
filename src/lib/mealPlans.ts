// Saved meal plans — build a day or week in the planner, save it as a named
// plan, reload it later (yours or the shared library). See supabase/sql/
// saved_meal_plans.sql.
import { supabase } from "@/lib/supabase";
import { getDiary, addDiaryItem, clearDiary } from "@/lib/store";

export interface PlanItem {
  dayIndex: number; // 0..6 (Mon..Sun); 0 for a single-day plan
  meal: string;
  source: "recipe" | "custom";
  recipe_id: string | null;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servings: number;
}

export interface SavedMealPlan {
  id: string;
  created_by: string | null;
  name: string;
  scope: "day" | "week";
  visibility: "private" | "shared";
  items: PlanItem[];
  created_at: string;
  mine?: boolean;
}

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (dateStr: string, n: number) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return fmt(d);
};

const toItem = (row: any, dayIndex: number): PlanItem => ({
  dayIndex,
  meal: row.meal || "Other",
  source: row.source === "recipe" ? "recipe" : "custom",
  recipe_id: row.recipe_id ?? null,
  name: row.name,
  calories: Number(row.calories) || 0,
  protein: Number(row.protein) || 0,
  carbs: Number(row.carbs) || 0,
  fats: Number(row.fats) || 0,
  servings: Number(row.servings) || 1,
});

/** Build a plan's items from the current diary.
 *  day  → the selected date's items (dayIndex 0)
 *  week → 7 days starting at weekStartDate (dayIndex 0..6) */
export const buildPlanItems = async (
  scope: "day" | "week",
  anchorDate: string,
  weekStartDate: string,
): Promise<PlanItem[]> => {
  if (scope === "day") {
    const rows = await getDiary(anchorDate);
    return rows.map((r: any) => toItem(r, 0));
  }
  const out: PlanItem[] = [];
  for (let i = 0; i < 7; i++) {
    const rows = await getDiary(addDays(weekStartDate, i));
    rows.forEach((r: any) => out.push(toItem(r, i)));
  }
  return out;
};

export const saveMealPlan = async (p: {
  name: string;
  scope: "day" | "week";
  visibility: "private" | "shared";
  items: PlanItem[];
}): Promise<{ success: boolean; error?: any }> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "not signed in" };
  const { error } = await supabase.from("saved_meal_plans").insert({
    created_by: user.id,
    name: p.name.trim() || "Untitled plan",
    scope: p.scope,
    visibility: p.visibility,
    items: p.items,
  });
  return { success: !error, error };
};

export const listMealPlans = async (): Promise<SavedMealPlan[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("saved_meal_plans")
    .select("*")
    .order("created_at", { ascending: false });
  return (data || []).map((r: any) => ({
    ...r,
    items: Array.isArray(r.items) ? r.items : [],
    mine: !!user && r.created_by === user.id,
  }));
};

export const deleteMealPlan = async (
  id: string,
): Promise<{ success: boolean; error?: any }> => {
  const { error } = await supabase
    .from("saved_meal_plans")
    .delete()
    .eq("id", id);
  return { success: !error, error };
};

/** Load a saved plan into the diary.
 *  mode "replace" clears the target day(s) first; "add" keeps what's there.
 *  anchorDate = the selected date (for day plans)
 *  weekStartDate = Monday of the currently-viewed week (for week plans) */
export const loadMealPlan = async (
  plan: SavedMealPlan,
  mode: "replace" | "add",
  anchorDate: string,
  weekStartDate: string,
): Promise<{ success: boolean; error?: any }> => {
  const dateFor = (dayIndex: number) =>
    plan.scope === "day" ? anchorDate : addDays(weekStartDate, dayIndex);

  if (mode === "replace") {
    const dates = new Set(plan.items.map((it) => dateFor(it.dayIndex)));
    // Always clear at least the anchor/week even if a plan has no items for a day.
    if (plan.scope === "day") dates.add(anchorDate);
    else for (let i = 0; i < 7; i++) dates.add(addDays(weekStartDate, i));
    for (const d of dates) await clearDiary(d);
  }

  let firstError: any = null;
  for (const it of plan.items) {
    const res = await addDiaryItem({
      date: dateFor(it.dayIndex),
      meal: it.meal,
      source: it.source,
      recipe_id: it.recipe_id,
      name: it.name,
      calories: it.calories,
      protein: it.protein,
      carbs: it.carbs,
      fats: it.fats,
      servings: it.servings,
    });
    if (!res.success && !firstError) firstError = res.error;
  }
  return { success: !firstError, error: firstError };
};
