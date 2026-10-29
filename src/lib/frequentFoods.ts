// "Your usuals" — the foods a member logs most for a given meal, so their
// staples (e.g. Weetabix for breakfast) come up as one-tap suggestions and
// show instantly at the top of search, no lookup needed.
import { supabase } from "@/lib/supabase";

export interface FrequentFood {
  name: string;
  meal: string;
  source: "recipe" | "custom";
  recipe_id: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servings: number;
  count: number; // how many times logged
  lastUsed: string; // ISO date
}

// Small in-memory cache so the picker is instant after the first load per session.
let cache: { at: number; rows: any[] } | null = null;

async function loadRecentDiary(): Promise<any[]> {
  if (cache && Date.now() - cache.at < 120000) return cache.rows;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("food_diary")
    .select("name,meal,source,recipe_id,calories,protein,carbs,fats,servings,date")
    .eq("member_id", user.id)
    .order("date", { ascending: false })
    .limit(600);
  const rows = data || [];
  cache = { at: Date.now(), rows };
  return rows;
}

/** Clear the cache after the member logs something new. */
export const refreshFrequentFoods = () => {
  cache = null;
};

/** Top foods for a meal, ranked by frequency + recency. */
export const getFrequentFoods = async (
  meal: string,
  limit = 10,
): Promise<FrequentFood[]> => {
  const rows = await loadRecentDiary();
  const now = Date.now();
  const byKey: Record<string, FrequentFood & { score: number }> = {};

  for (const r of rows) {
    if ((r.meal || "") !== meal) continue;
    const key = String(r.name || "").toLowerCase().trim();
    if (!key) continue;
    const daysAgo = Math.max(
      0,
      (now - new Date(r.date + "T00:00:00").getTime()) / 86400000,
    );
    // Recent logs weigh more; everything still counts toward frequency.
    const recency = daysAgo <= 7 ? 3 : daysAgo <= 30 ? 2 : 1;
    if (!byKey[key]) {
      byKey[key] = {
        name: r.name,
        meal,
        source: r.source === "recipe" ? "recipe" : "custom",
        recipe_id: r.recipe_id ?? null,
        calories: Math.round(Number(r.calories) || 0),
        protein: Math.round(Number(r.protein) || 0),
        carbs: Math.round(Number(r.carbs) || 0),
        fats: Math.round(Number(r.fats) || 0),
        servings: Number(r.servings) || 1,
        count: 0,
        lastUsed: r.date,
        score: 0,
      };
    }
    byKey[key].count += 1;
    byKey[key].score += recency;
    // Keep the most recent row's macros (first seen = newest, since sorted desc).
  }

  return Object.values(byKey)
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .slice(0, limit)
    .map(({ score, ...f }) => f);
};
