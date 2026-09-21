/**
 * Smart alternates client — calls the `get-alternates` edge function and
 * provides a local ranking fallback when the function isn't available (e.g.
 * offline or not deployed yet). The edge function is the source of truth for
 * ranking; the client fallback mirrors the same logic so swaps feel
 * consistent either way.
 *
 * Phase 1a: tag-based ranking. Phase 1b adds embeddings (see
 * `ai_programming_phase1b_setup.sql`) — the edge function blends hard
 * filters with semantic similarity where embeddings exist.
 */
import { supabase } from "@/lib/supabase";

export interface AlternateCandidate {
  id: string;
  name: string;
  muscle?: string;
  equipment?: string;
  difficulty?: string;
  movementType?: string;
  videoUrl?: string;
  movement_family?: string;
  reason: string;
  score: number;
}

export interface AlternateContext {
  equipment?: string[];
  patternsUsedThisWeek?: string[];
  sessionExercises?: string[];
  memberInjuries?: string[];
  difficulty?: string;
}

const norm = (s: any) =>
  String(s || "")
    .toLowerCase()
    .trim();

const toArray = (v: any): string[] =>
  Array.isArray(v)
    ? v.map((s: string) => norm(s)).filter(Boolean)
    : String(v || "")
        .split(/[;,]/)
        .map((s: string) => norm(s))
        .filter(Boolean);

export const getSmartAlternates = async (
  exerciseId: string,
  context: AlternateContext,
): Promise<{
  alternates: AlternateCandidate[];
  origin?: any;
  fromServer: boolean;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke("get-alternates", {
      body: {
        staffSecret:
          import.meta.env.VITE_STAFF_SECRET ||
          localStorage.getItem("fittrack_staff_secret") ||
          "",
        action: "get_alternates",
        exerciseId,
        context,
      },
    });
    if (error || !data?.alternates) throw error || new Error("no alternates");
    return {
      alternates: data.alternates as AlternateCandidate[],
      origin: data.origin,
      fromServer: true,
    };
  } catch {
    return { alternates: [], fromServer: false };
  }
};

// ── Client-side fallback ranking ──
// Mirrors the edge function's scoreCandidate so local swaps are consistent.
// Uses the structured fields (movement_pattern, movement_family,
// primary_muscles, unilateral, is_compound, contraindications) when present,
// falling back to the legacy movementType tags for older rows.
export const rankAlternatesLocally = (
  origin: any,
  allExercises: any[],
  context: AlternateContext,
): AlternateCandidate[] => {
  const origTags = toArray(origin?.movementType);
  const origPattern = norm(origin?.movement_pattern);
  const origFamily = norm(origin?.movement_family);
  const origMuscles = toArray(origin?.primary_muscles);
  const origUnilateral = !!origin?.unilateral;
  const origCompound = !!origin?.is_compound;
  const origAlternates = toArray(origin?.alternates);
  const venueEq = (context.equipment || []).map((e) => norm(e));
  const injuries = (context.memberInjuries || []).map((s) => norm(s));

  // Families already used elsewhere this week (down-rank, don't exclude).
  const familiesThisWeek = (context.patternsUsedThisWeek || []).map((s) =>
    norm(s),
  );

  return allExercises
    .filter((e) => String(e.id) !== String(origin?.id))
    .filter((c) => {
      // Injury safety — exclude contraindicated movements.
      const contra = toArray(c?.contraindications);
      if (injuries.length && contra.some((ci) => injuries.includes(ci)))
        return false;
      return true;
    })
    .map((c) => {
      let score = 0;
      const reasons: string[] = [];
      const candTags = toArray(c?.movementType);
      const candPattern = norm(c?.movement_pattern);
      const candFamily = norm(c?.movement_family);
      const candMuscles = toArray(c?.primary_muscles);

      // Same movement pattern (structured) — the primary filter.
      if (origPattern && candPattern && candPattern === origPattern) {
        score += 30;
        reasons.push(`same pattern (${candPattern.replace(/_/g, " ")})`);
      } else if (origTags.some((t) => candTags.includes(t))) {
        // Legacy fallback — same movement type tag.
        score += 18;
        reasons.push("similar movement type");
      } else if (origPattern && candPattern) {
        // Different pattern — strong down-rank.
        score -= 25;
      }

      // Curated alternates get a boost.
      if (
        origAlternates.includes(String(c.id)) ||
        origAlternates.includes(norm(c.name))
      ) {
        score += 15;
        reasons.push("curated alternate");
      }

      // Equipment.
      const candEq = norm(c?.equipment);
      if (
        venueEq.length &&
        candEq.includes("machine") &&
        !venueEq.includes(candEq)
      ) {
        score -= 50;
      } else {
        score += 8;
      }

      // Not used this session.
      const sessionIds = (context.sessionExercises || []).map((s) => String(s));
      if (!sessionIds.includes(String(c.id))) {
        score += 8;
        reasons.push("not used this session");
      } else {
        score -= 30;
      }

      // Down-rank if the movement family is already used this week.
      if (candFamily && familiesThisWeek.includes(candFamily)) {
        score -= 10;
        reasons.push("family used this week");
      } else if (candFamily) {
        score += 5;
      }

      // Same primary muscles.
      if (origMuscles.length && candMuscles.length) {
        if (origMuscles.some((m) => candMuscles.includes(m))) {
          score += 8;
          reasons.push("same primary muscle");
        }
      }

      // Matching unilateral / compound.
      if (origUnilateral === !!c?.unilateral) score += 4;
      if (origCompound === !!c?.is_compound) score += 4;

      // Difficulty near origin.
      const dRank: Record<string, number> = {
        beginner: 0,
        intermediate: 1,
        advanced: 2,
      };
      const od = dRank[norm(origin?.difficulty)] ?? 1;
      const cd = dRank[norm(c?.difficulty)] ?? 1;
      if (Math.abs(cd - od) <= 1) {
        score += 6;
        if (cd < od) reasons.push("slightly easier");
        if (cd > od) reasons.push("slightly harder");
      }

      return {
        id: String(c.id),
        name: c.name,
        muscle: c.muscle,
        equipment: c.equipment,
        difficulty: c.difficulty,
        movementType: c.movementType,
        videoUrl: c.videoUrl,
        movement_family: candFamily || undefined,
        reason: reasons.length ? reasons.join(" · ") : "pattern match",
        score,
      } as AlternateCandidate;
    })
    .filter((c) => c.score >= -20)
    .sort((a, b) => {
      if (b.score === a.score) return norm(a.name).localeCompare(norm(b.name));
      return b.score - a.score;
    })
    .slice(0, 8);
};

// ── Variety check ──
export interface VarietyIssue {
  type: "family_overuse" | "duplicate_exercise" | "doubled_isolation";
  message: string;
  family?: string;
  count?: number;
  cap?: number;
  days?: string[];
  exerciseId?: string;
  day?: string;
}

export const checkVariety = async (
  weekDraft: any[],
  caps?: { varietyCaps?: Record<string, number>; isolationPerSession?: number },
): Promise<{ issues: VarietyIssue[]; fromServer: boolean }> => {
  try {
    const { data, error } = await supabase.functions.invoke("get-alternates", {
      body: {
        staffSecret:
          import.meta.env.VITE_STAFF_SECRET ||
          localStorage.getItem("fittrack_staff_secret") ||
          "",
        action: "check_variety",
        weekDraft,
        caps: caps || {},
      },
    });
    if (error || !data) throw error || new Error("no variety response");
    return { issues: data.issues as VarietyIssue[], fromServer: true };
  } catch {
    // Client fallback.
    return { issues: checkVarietyLocally(weekDraft, caps), fromServer: false };
  }
};

const familyKeyLocal = (name: string, id: string): string => {
  const n = norm(name);
  if (/glute ?bridge|hip ?thrust/.test(n)) return "glute_bridge";
  if (/rdl|romanian|single.?leg.*deadlift/.test(n)) return "sl_rdl";
  if (/deadlift/.test(n)) return "hinge";
  if (/squat/.test(n)) return "squat";
  if (/bench|chest ?press/.test(n)) return "press";
  if (/row/.test(n)) return "row";
  if (/lunge/.test(n)) return "lunge";
  if (/plank/.test(n)) return "plank";
  return norm(id);
};

export const checkVarietyLocally = (
  weekDraft: any[],
  caps?: {
    varietyCaps?: Record<string, number>;
    isolationPerSession?: number;
    flagDuplicateExactAcrossWeek?: boolean;
  },
): VarietyIssue[] => {
  const capMap = caps?.varietyCaps || {};
  const isoCap = caps?.isolationPerSession ?? 1;
  const flagDup = caps?.flagDuplicateExactAcrossWeek ?? true;
  const issues: VarietyIssue[] = [];
  const familyCount: Record<string, { count: number; days: string[] }> = {};
  // Track exact exercise ids across the whole week.
  const weekExact: Record<string, { count: number; days: string[] }> = {};

  weekDraft.forEach((session, sIdx) => {
    const items = session.exercises || [];
    const dayLabel = `Day ${session.day ?? sIdx + 1}`;
    const seen: Record<string, number> = {};

    items.forEach((ex: any) => {
      if (ex.isSection) return;
      const fam =
        norm(ex.movement_family) || familyKeyLocal(ex.name, String(ex.id));
      if (!familyCount[fam]) familyCount[fam] = { count: 0, days: [] };
      familyCount[fam].count += 1;
      if (!familyCount[fam].days.includes(dayLabel))
        familyCount[fam].days.push(dayLabel);

      // Exact duplicate within session.
      const exName = norm(ex.name);
      seen[exName] = (seen[exName] || 0) + 1;
      if (seen[exName] > 1) {
        issues.push({
          type: "duplicate_exercise",
          message: `${ex.name} appears ${seen[exName]}× in ${dayLabel}`,
          exerciseId: ex.id,
        });
      }

      // Exact duplicate across the week (by id).
      if (flagDup) {
        const exId = String(ex.id || ex.name);
        if (!weekExact[exId]) weekExact[exId] = { count: 0, days: [] };
        weekExact[exId].count += 1;
        if (!weekExact[exId].days.includes(dayLabel))
          weekExact[exId].days.push(dayLabel);
      }

      // Doubled isolation — use structured movement_pattern or legacy tags.
      const pattern = norm(ex.movement_pattern);
      const tags = toArray(ex.movementType);
      const isIsolation =
        pattern.startsWith("isolation") ||
        tags.includes("isolation") ||
        tags.includes("accessory");
      if (isIsolation) {
        const iso = items.filter(
          (i) =>
            !i.isSection &&
            (norm(i.movement_pattern).startsWith("isolation") ||
              toArray(i.movementType).some(
                (t) => t === "isolation" || t === "accessory",
              )),
        ).length;
        if (
          iso > isoCap &&
          !issues.find(
            (x) => x.type === "doubled_isolation" && x.day === dayLabel,
          )
        ) {
          issues.push({
            type: "doubled_isolation",
            day: dayLabel,
            message: `${iso} isolation exercises in ${dayLabel} — consider varying`,
          });
        }
      }
    });
  });

  // Exact-duplicate-across-week issues.
  if (flagDup) {
    Object.entries(weekExact).forEach(([id, info]) => {
      if (info.count > 1) {
        issues.push({
          type: "duplicate_exercise",
          message: `Same exercise on ${info.days.join(" & ")} — vary one?`,
          exerciseId: id,
          days: info.days,
        });
      }
    });
  }

  Object.entries(familyCount).forEach(([fam, info]) => {
    const cap = capMap[fam] || capMap.default || 2;
    if (info.count > cap) {
      issues.push({
        type: "family_overuse",
        family: fam,
        count: info.count,
        cap,
        message: `${fam.replace(/_/g, " ")} used ${info.count}× this week (cap ${cap}) — vary?`,
        days: info.days,
      });
    }
  });

  return issues;
};

// Load the variety caps from feature_settings.coach (staff-editable, no rebuild).
// Shape: { variety_caps: { maxPerFamilyPerWeek, default, maxSameIsolationPerSession, flagDuplicateExactAcrossWeek } }
export const getVarietyCaps = async (): Promise<{
  varietyCaps: Record<string, number>;
  isolationPerSession: number;
  flagDuplicateExactAcrossWeek: boolean;
}> => {
  try {
    const { data } = await supabase
      .from("feature_settings")
      .select("value")
      .eq("key", "coach")
      .maybeSingle();
    const caps = data?.value?.variety_caps;
    if (caps) {
      return {
        varietyCaps: { default: caps.default ?? 2, ...caps },
        isolationPerSession: caps.maxSameIsolationPerSession ?? 1,
        flagDuplicateExactAcrossWeek: caps.flagDuplicateExactAcrossWeek ?? true,
      };
    }
  } catch {}
  return {
    varietyCaps: { default: 2 },
    isolationPerSession: 1,
    flagDuplicateExactAcrossWeek: true,
  };
};
