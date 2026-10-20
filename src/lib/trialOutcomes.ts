import { supabase } from "./supabase";

export type TrialOutcomeKind = "won" | "lost";
export type TrialLossReason =
  | "price"
  | "timing"
  | "not_for_them"
  | "went_elsewhere"
  | "other";

export const LOSS_REASONS: { key: TrialLossReason; label: string }[] = [
  { key: "price", label: "Price" },
  { key: "timing", label: "Timing" },
  { key: "not_for_them", label: "Not for them" },
  { key: "went_elsewhere", label: "Went elsewhere" },
  { key: "other", label: "Other" },
];

export interface TrialOutcome {
  email: string;
  outcome: TrialOutcomeKind;
  reason: TrialLossReason | null;
  note: string | null;
  created_at?: string;
}

/** All recorded trial outcomes, keyed by lowercased email. */
export const getTrialOutcomes = async (): Promise<Map<string, TrialOutcome>> => {
  const out = new Map<string, TrialOutcome>();
  try {
    const { data, error } = await supabase
      .from("trial_outcomes")
      .select("email, outcome, reason, note, created_at");
    if (error) throw error;
    for (const r of (data as any[]) ?? [])
      out.set(String(r.email).toLowerCase(), {
        email: r.email,
        outcome: r.outcome,
        reason: r.reason ?? null,
        note: r.note ?? null,
        created_at: r.created_at,
      });
  } catch (e) {
    console.warn("[trialOutcomes] getTrialOutcomes:", e);
  }
  return out;
};

/** Record (or update) a trialist's outcome. `reason` only applies to 'lost'. */
export const setTrialOutcome = async (payload: {
  email: string;
  outcome: TrialOutcomeKind;
  reason?: TrialLossReason | null;
  note?: string | null;
  by?: string | null;
}): Promise<{ error: any }> => {
  const { error } = await supabase.from("trial_outcomes").upsert(
    {
      email: payload.email,
      outcome: payload.outcome,
      reason: payload.outcome === "lost" ? payload.reason ?? null : null,
      note: payload.note ?? null,
      decided_by: payload.by ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );
  return { error };
};

export const clearTrialOutcome = async (
  email: string,
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("trial_outcomes")
    .delete()
    .eq("email", email);
  return { error };
};
