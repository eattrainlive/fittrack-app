export const PROG_CATEGORIES = [
  "Foundations",
  "Stronger",
  "Fusion",
  "Performance",
  "Group PT",
  "PT",
  "Other",
] as const;

export type ProgCategory = (typeof PROG_CATEGORIES)[number];

export const guessCategory = (name = ""): ProgCategory => {
  const s = name.toLowerCase();
  if (/foundation/.test(s)) return "Foundations";
  if (/stronger/.test(s)) return "Stronger";
  if (/fusion/.test(s)) return "Fusion";
  if (/performance/.test(s)) return "Performance";
  if (/group\s*pt/.test(s)) return "Group PT";
  if (/\bpt\b|semi[\s-]?private/.test(s)) return "PT";
  return "Other";
};

export const CATEGORY_ORDER = [...PROG_CATEGORIES];

export interface GroupedPrograms {
  category: ProgCategory;
  items: any[];
}

/** Group programmes by `category` (falling back to a name guess), newest-first. */
export const groupProgramsByCategory = (programs: any[]): GroupedPrograms[] => {
  const map: Record<string, any[]> = {};
  for (const p of programs) {
    const cat = (p.category || guessCategory(p.name || "")) as ProgCategory;
    (map[cat] ||= []).push(p);
  }
  for (const cat of Object.keys(map)) {
    map[cat].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime(),
    );
  }
  return CATEGORY_ORDER.filter((c) => map[c]?.length).map((c) => ({
    category: c,
    items: map[c],
  }));
};
