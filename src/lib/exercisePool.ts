/**
 * Exercise-pool + section-aware shuffle helpers, extracted from Admin.tsx.
 *
 * These are pure functions over the exercise library + enrichment table —
 * no component state. Extracted to keep Admin.tsx under the mutation limit.
 */
import { useMemo } from "react";

export const norm = (s: string) =>
  String(s || "")
    .toLowerCase()
    .trim();

export const mt = (e: any) =>
  Array.isArray(e?.movementType)
    ? e.movementType
    : String(e?.movementType || "")
        .split(/[;,]/)
        .map((s: string) => s.trim())
        .filter(Boolean);

export const STRENGTH_TAGS = [
  "Push",
  "Horizontal Push",
  "Vertical Push",
  "Pull",
  "Horizontal Pull",
  "Vertical Pull",
  "Knee",
  "Hip",
  "Core",
  "Carries",
  "Accessory",
];

export const isStrengthMove = (e: any) =>
  mt(e).some((t: string) => STRENGTH_TAGS.includes(t));

export function enclosingSectionName(items: any[], i: number): string {
  for (let k = i; k >= 0; k--) {
    if (items[k]?.isSection) return String(items[k].name || "");
  }
  return "";
}

export function sectionRole(name: string): string {
  const n = norm(name);
  if (/warm ?up|mobility|prep/.test(n)) return "warmup";
  if (/fire ?up|activation|prime/.test(n)) return "activation";
  if (/\blift\b|strength|main lift|primary/.test(n)) return "lift";
  if (/burn/.test(n)) return "burn";
  if (/finisher|core|cardio|conditioning|engine|metcon|burnout/.test(n))
    return "finisher";
  return "any";
}

const BW_BAND = /bodyweight|band/i;
const ALLOWED_BW_PULL = /pull ?up|chin ?up|ring row|inverted row/i;
export const isLoaded = (e: any) => {
  const eq = String(e?.equipment || "");
  return BW_BAND.test(eq) ? ALLOWED_BW_PULL.test(String(e?.name || "")) : true;
};

export const hasTag = (e: any, re: RegExp) =>
  mt(e).some((t: string) => re.test(t));

export const catOf = (e: any) => String(e?.categories || e?.category || "");

export function fitsSection(e: any, role: string): boolean {
  switch (role) {
    case "warmup":
      return hasTag(e, /warm ?up/i) || /mobility/i.test(catOf(e));
    case "activation":
      return hasTag(e, /fire ?up|activation/i) || /activation/i.test(catOf(e));
    case "lift":
      return isStrengthMove(e) && isLoaded(e) && !hasTag(e, /accessory/i);
    case "burn":
      return isStrengthMove(e) && isLoaded(e);
    case "finisher":
      return (
        hasTag(e, /accessory|core|conditioning|carries/i) ||
        /cardio|conditioning/i.test(catOf(e))
      );
    default:
      return true;
  }
}

/**
 * Build a swap pool for a library exercise, respecting movement families and
 * coach-picked enrichment alternates. `exercises` = full library,
 * `enrichment` = the enrichment lookup keyed by exercise id.
 */
export function rulesBasedPool(
  libEx: any,
  exercises: any[],
  enrichment: Record<string, any>,
): any[] {
  const libTags = mt(libEx);
  const origIsStrength = isStrengthMove(libEx);

  const FAMILY: Record<string, string[]> = {
    push: ["Push", "Horizontal Push", "Vertical Push"],
    pull: ["Pull", "Horizontal Pull", "Vertical Pull"],
    knee: ["Knee"],
    hip: ["Hip"],
  };
  const famKey = Object.keys(FAMILY).find((f) =>
    FAMILY[f].some((t) => libTags.includes(t)),
  );
  if (famKey) {
    const famSet = FAMILY[famKey];
    const inFamily = exercises.filter(
      (e) =>
        e.id !== libEx.id &&
        mt(e).some((t: string) => famSet.includes(t)) &&
        isStrengthMove(e) === origIsStrength,
    );
    if (inFamily.length) return inFamily;
  }

  const row = enrichment[String(libEx.id)];
  if (row) {
    const cols = [
      "alt_same_pattern",
      "alt_equipment",
      "alt_progress",
      "alt_regress",
      "alt_joint_friendly",
      "alt_home",
    ];
    const seen = new Set<string>([String(libEx.id)]);
    const alts: any[] = [];
    const byName: Record<string, any> = {};
    exercises.forEach((e) => {
      byName[norm(e.name)] = e;
    });
    for (const c of cols) {
      String(row[c] || "")
        .split(/[,/]| or /i)
        .map(norm)
        .filter(Boolean)
        .forEach((tok) => {
          const ex = byName[tok];
          if (ex && !seen.has(String(ex.id))) {
            seen.add(String(ex.id));
            alts.push(ex);
          }
        });
    }
    if (alts.length) return alts;
  }

  const specific = libTags[0];
  if (specific) {
    const samePattern = exercises.filter(
      (e) =>
        e.id !== libEx.id &&
        mt(e).includes(specific) &&
        isStrengthMove(e) === origIsStrength,
    );
    if (samePattern.length) return samePattern;
  }
  return [];
}

/** Hook: O(1) exercise lookup by id. */
export const useExById = (exercises: any[]) =>
  useMemo(() => {
    const m: Record<string, any> = {};
    exercises.forEach((e) => {
      m[String(e.id)] = e;
    });
    return m;
  }, [exercises]);

/** Hook: name → exercise map. */
export const useByName = (exercises: any[]) =>
  useMemo(() => {
    const m: Record<string, any> = {};
    exercises.forEach((e) => {
      m[norm(e.name)] = e;
    });
    return m;
  }, [exercises]);

/** Hook: pre-sorted exercise list for picker dropdowns. */
export const useSortedExercises = (exercises: any[]) =>
  useMemo(
    () => [...exercises].sort((a, b) => a.name.localeCompare(b.name)),
    [exercises],
  );
