// Staff-side read of a member's food diary. Requires the food_diary_staff_read
// RLS policy (supabase/sql/food_diary_staff_read.sql) — view-only.
// Totals are servings-aware, matching exactly what the member sees in their app
// (dayTotals = Σ macro × servings).
import { supabase } from "@/lib/supabase";

export interface DiaryEntry {
  id: string;
  date: string; // ISO yyyy-mm-dd
  meal: string | null;
  name: string;
  source: string;
  recipe_id: string | null;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface Totals {
  cal: number;
  p: number;
  c: number;
  f: number;
}

export const MEAL_ORDER = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Side",
  "Snack",
  "Other",
];

/** Macros for one entry, servings applied (as the member's app shows them). */
export const entryTotals = (e: DiaryEntry): Totals => {
  const m = e.servings || 1;
  return {
    cal: Math.round((e.calories || 0) * m),
    p: Math.round((e.protein || 0) * m),
    c: Math.round((e.carbs || 0) * m),
    f: Math.round((e.fats || 0) * m),
  };
};

export const sumTotals = (entries: DiaryEntry[]): Totals =>
  entries.reduce(
    (t, e) => {
      const x = entryTotals(e);
      return { cal: t.cal + x.cal, p: t.p + x.p, c: t.c + x.c, f: t.f + x.f };
    },
    { cal: 0, p: 0, c: 0, f: 0 },
  );

/** Fetch a member's diary entries between two ISO dates (inclusive). */
export const fetchMemberDiary = async (
  memberId: string,
  fromISO: string,
  toISO: string,
): Promise<DiaryEntry[]> => {
  const { data, error } = await supabase
    .from("food_diary")
    .select("*")
    .eq("member_id", memberId)
    .gte("date", fromISO)
    .lte("date", toISO)
    .order("date")
    .order("created_at");
  if (error) {
    console.warn("fetchMemberDiary failed", error);
    return [];
  }
  return (data || []).map((r: any) => ({
    id: r.id,
    date: r.date,
    meal: r.meal ?? null,
    name: r.name,
    source: r.source,
    recipe_id: r.recipe_id ?? null,
    servings: Number(r.servings) || 1,
    calories: Number(r.calories) || 0,
    protein: Number(r.protein) || 0,
    carbs: Number(r.carbs) || 0,
    fats: Number(r.fats) || 0,
  }));
};
