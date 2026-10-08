import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { logStaffActions, type Trialist } from "./staffHubMetrics";

/**
 * Trialist pipeline stages for the Staff Hub "Trialists" call list.
 *
 * Cards AUTO-bucket from live data:
 *   - trial_cohort.converted = true            -> "joined"        (ground truth)
 *   - review_bookings booked/completed & live  -> "booked_review"
 *   - otherwise                                -> "to_contact"    (still chasing)
 * A coach can MOVE a card by hand (stored in staff_trial_stage); the manual
 * choice wins — EXCEPT a confirmed paid membership (converted) always shows as
 * "joined". "not_joined" is only ever set by hand (we never auto-bin a trialist
 * just because their trial end date has passed — an overdue trial is the hottest
 * call, not a lost one).
 */
export type TrialStage =
  "to_contact" | "booked_review" | "joined" | "not_joined";

export const TRIAL_STAGE_ORDER: TrialStage[] = [
  "to_contact",
  "booked_review",
  "joined",
  "not_joined",
];

export const TRIAL_STAGE_LABELS: Record<TrialStage, string> = {
  to_contact: "To contact",
  booked_review: "Booked review",
  joined: "Joined",
  not_joined: "Not joined",
};

export interface EnrichedTrialist extends Trialist {
  key: string; // normalised email
  name: string; // "First Last"
  autoStage: TrialStage; // computed from live data
  manualStage: TrialStage | null; // coach override, if any
  effectiveStage: TrialStage; // what to display/group by
  converted: boolean; // confirmed paid membership
  convertedProduct: string | null;
  reviewAt: string | null; // booked review time, if any
  stageLocked: boolean; // true when converted forces "joined" (can't override)
}

const emailKey = (e?: string | null) =>
  String(e || "")
    .toLowerCase()
    .trim();

interface CohortRow {
  email: string;
  converted: boolean | null;
  converted_product: string | null;
}
interface ReviewRow {
  email: string;
  status: string | null;
  appointment_at: string | null;
}
interface StageRow {
  email: string;
  stage: TrialStage;
}

function computeAutoStage(converted: boolean, liveReview: boolean): TrialStage {
  if (converted) return "joined";
  if (liveReview) return "booked_review";
  return "to_contact";
}

/**
 * Joins the proxy trialists to Supabase (trial_cohort / review_bookings /
 * staff_trial_stage), computes each card's stage, and groups by stage.
 * Returns a `setStage` to move a card by hand (persists + logs an action).
 */
export function useTrialStages(
  trialists: Trialist[] | undefined,
  staffName: string,
) {
  const [cohort, setCohort] = useState<Record<string, CohortRow>>({});
  const [reviews, setReviews] = useState<Record<string, ReviewRow>>({});
  const [overrides, setOverrides] = useState<Record<string, TrialStage>>({});
  const [loading, setLoading] = useState(true);

  const loadSupabase = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: cRows }, { data: rRows }, { data: sRows }] =
        await Promise.all([
          supabase
            .from("trial_cohort")
            .select("email,converted,converted_product"),
          supabase
            .from("review_bookings")
            .select("email,status,appointment_at"),
          supabase.from("staff_trial_stage").select("email,stage"),
        ]);
      const cmap: Record<string, CohortRow> = {};
      for (const r of (cRows || []) as CohortRow[]) {
        const k = emailKey(r.email);
        if (k) cmap[k] = r;
      }
      const rmap: Record<string, ReviewRow> = {};
      for (const r of (rRows || []) as ReviewRow[]) {
        const k = emailKey(r.email);
        if (k) rmap[k] = r;
      }
      const omap: Record<string, TrialStage> = {};
      for (const r of (sRows || []) as StageRow[]) {
        const k = emailKey(r.email);
        if (k) omap[k] = r.stage;
      }
      setCohort(cmap);
      setReviews(rmap);
      setOverrides(omap);
    } catch {
      // tables may be unreadable (non-staff / RLS) — soft-fail to auto "to_contact"
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSupabase();
  }, [loadSupabase]);

  const enriched: EnrichedTrialist[] = useMemo(() => {
    const now = Date.now();
    return (trialists ?? []).map((t) => {
      const key = emailKey(t.email);
      const c = cohort[key];
      const converted = c?.converted === true;
      const r = reviews[key];
      const status = String(r?.status || "")
        .toLowerCase()
        .trim();
      const liveReview =
        !!r &&
        (status === "booked" || status === "completed") &&
        (!r.appointment_at || new Date(r.appointment_at).getTime() >= now);
      const autoStage = computeAutoStage(converted, liveReview);
      const manualStage = overrides[key] ?? null;
      // Converted is ground truth: always "joined", override ignored & locked.
      const effectiveStage: TrialStage = converted
        ? "joined"
        : (manualStage ?? autoStage);
      return {
        ...t,
        key,
        name: `${t.first ?? ""} ${t.last ?? ""}`.trim() || t.email,
        autoStage,
        manualStage,
        effectiveStage,
        converted,
        convertedProduct: c?.converted_product ?? null,
        reviewAt: r?.appointment_at ?? null,
        stageLocked: converted,
      };
    });
  }, [trialists, cohort, reviews, overrides]);

  const byStage = useMemo(() => {
    const groups: Record<TrialStage, EnrichedTrialist[]> = {
      to_contact: [],
      booked_review: [],
      joined: [],
      not_joined: [],
    };
    for (const e of enriched) groups[e.effectiveStage].push(e);
    return groups;
  }, [enriched]);

  /**
   * Move a trialist to a stage by hand. Persists the override, updates the UI
   * optimistically, and logs an action so the move shows in the history.
   * No-op for a converted (locked) card.
   */
  const setStage = useCallback(
    async (t: EnrichedTrialist, stage: TrialStage) => {
      if (t.stageLocked || stage === t.effectiveStage) return;
      setOverrides((prev) => ({ ...prev, [t.key]: stage })); // optimistic
      try {
        const { error } = await supabase.from("staff_trial_stage").upsert(
          {
            email: t.email,
            stage,
            moved_by: staffName || "Staff",
            moved_at: new Date().toISOString(),
          },
          { onConflict: "email" },
        );
        if (error) throw error;
        // Record the move in the append-only log (best-effort).
        logStaffActions([
          {
            type: "trialist",
            who: t.name,
            email: t.email,
            outcome: `Moved to ${TRIAL_STAGE_LABELS[stage]}`,
            by: staffName || "Staff",
          },
        ]).catch(() => {});
        return true;
      } catch {
        // Roll back the optimistic move on failure.
        setOverrides((prev) => {
          const next = { ...prev };
          if (t.manualStage) next[t.key] = t.manualStage;
          else delete next[t.key];
          return next;
        });
        return false;
      }
    },
    [staffName],
  );

  return { byStage, enriched, loading, setStage, reload: loadSupabase };
}
