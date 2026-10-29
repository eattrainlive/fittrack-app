// Curated in-app food database — instant literal search over the gym's own
// foods table (common UK staples + brands they sell). See supabase/sql/foods_table.sql.
import { supabase } from "@/lib/supabase";

export interface FoodRow {
  id: string;
  name: string;
  brand: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fibre: number | null;
  serving_desc: string | null;
  serving_g: number | null;
  category: string | null;
  verified: boolean;
}

// Shape the Quick Add dialog already renders (same as the OFF results).
export interface FoodResult {
  name: string;
  per100: { cal: number; protein: number; carbs: number; fats: number };
  serving: string | null;
  servingG: number | null;
  image: string | null;
  fromLibrary?: boolean;
}

const toResult = (f: FoodRow): FoodResult => ({
  name: f.brand ? `${f.name} · ${f.brand}` : f.name,
  per100: {
    cal: Math.round(f.calories || 0),
    protein: Math.round(f.protein || 0),
    carbs: Math.round(f.carbs || 0),
    fats: Math.round(f.fats || 0),
  },
  serving: f.serving_desc,
  servingG: f.serving_g != null ? Number(f.serving_g) : null,
  image: null,
  fromLibrary: true,
});

/** Instant search of the food library (name + brand), for Quick Add. */
export const searchFoodsDb = async (q: string): Promise<FoodResult[]> => {
  const term = q.trim();
  if (term.length < 2) return [];
  const like = `%${term.replace(/[%_]/g, "")}%`;
  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .or(`name.ilike.${like},brand.ilike.${like}`)
    .order("verified", { ascending: false })
    .limit(25);
  if (error) {
    console.warn("searchFoodsDb failed", error);
    return [];
  }
  // Prefer matches where the term hits the start of name/brand.
  const t = term.toLowerCase();
  const score = (f: FoodRow) => {
    const n = f.name.toLowerCase();
    const b = (f.brand || "").toLowerCase();
    if (n.startsWith(t) || b.startsWith(t)) return 0;
    if (n.includes(t)) return 1;
    return 2;
  };
  return (data as FoodRow[])
    .sort((a, b) => score(a) - score(b))
    .map(toResult);
};

/**
 * Member contribution: when a member logs a food that came from the Open Food
 * Facts fallback (NOT already in our library), save it into `foods` so it's
 * there for everyone next time. Goes in as verified=false, source='member' via
 * a SECURITY DEFINER function (members can't write the table directly). The
 * function dedupes + sanity-checks, so this is safe to fire-and-forget.
 * See supabase/sql/foods_member_contribute.sql.
 */
export const contributeFood = async (r: {
  name: string;
  per100: { cal: number; protein: number; carbs: number; fats: number };
  serving?: string | null;
  servingG?: number | null;
}): Promise<void> => {
  try {
    // Library results render as "Name · Brand"; strip that just in case.
    const name = r.name.split(" · ")[0].trim();
    await supabase.rpc("add_member_food", {
      p_name: name,
      p_brand: null,
      p_calories: r.per100.cal,
      p_protein: r.per100.protein,
      p_carbs: r.per100.carbs,
      p_fats: r.per100.fats,
      p_fibre: null,
      p_serving_desc: r.serving ?? null,
      p_serving_g: r.servingG ?? null,
      p_category: null,
    });
  } catch {
    /* best effort — never block the member's log */
  }
};

// ── Admin CRUD (staff) ───────────────────────────────────────────────────────

export const listFoods = async (search = ""): Promise<FoodRow[]> => {
  let query = supabase.from("foods").select("*").order("name").limit(500);
  const term = search.trim();
  if (term.length >= 1) {
    const like = `%${term.replace(/[%_]/g, "")}%`;
    query = query.or(`name.ilike.${like},brand.ilike.${like}`);
  }
  const { data } = await query;
  return (data as FoodRow[]) || [];
};

export const upsertFood = async (
  f: Partial<FoodRow> & { name: string },
): Promise<{ success: boolean; error?: any }> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const row: any = {
    name: f.name.trim(),
    brand: f.brand?.trim() || null,
    calories: Number(f.calories) || 0,
    protein: Number(f.protein) || 0,
    carbs: Number(f.carbs) || 0,
    fats: Number(f.fats) || 0,
    fibre: f.fibre != null && f.fibre !== ("" as any) ? Number(f.fibre) : null,
    serving_desc: f.serving_desc?.trim() || null,
    serving_g:
      f.serving_g != null && f.serving_g !== ("" as any)
        ? Number(f.serving_g)
        : null,
    category: f.category?.trim() || null,
    verified: f.verified ?? true,
  };
  if (f.id) row.id = f.id;
  else row.created_by = user?.id ?? null;
  const { error } = await supabase.from("foods").upsert(row);
  return { success: !error, error };
};

export const deleteFood = async (
  id: string,
): Promise<{ success: boolean; error?: any }> => {
  const { error } = await supabase.from("foods").delete().eq("id", id);
  return { success: !error, error };
};
