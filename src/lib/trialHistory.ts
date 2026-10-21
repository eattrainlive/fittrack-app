import { supabase } from "@/lib/supabase";
import { trialType, trialLengthDays, type TrialType } from "@/lib/trialNurture";
import { LOSS_REASONS } from "@/lib/trialOutcomes";

/**
 * Trial history — every trialist grouped by the MONTH their trial started, with
 * what trial they did and whether/what they converted onto. Powers the "History"
 * tab in the Trials hub (month-by-month archive + conversion summary).
 */

export type TrialOutcomeState =
  | "converted" // signed up to a paid membership
  | "lost" // coach marked them lost
  | "not_converted" // trial window ended, no conversion recorded
  | "on_trial"; // still inside their trial window

export interface TrialHistoryRow {
  email: string;
  name: string;
  trialType: TrialType;
  trialTypeLabel: string; // "Coached 30" / "Kickstart 21"
  trialProduct: string | null; // the raw plan name
  trialStart: string; // YYYY-MM-DD
  state: TrialOutcomeState;
  convertedProduct: string | null; // what they joined onto, if converted
  convertedAt: string | null;
  lossReason: string | null; // human label, if lost
}

export interface TrialHistoryMonth {
  key: string; // "2026-10"
  label: string; // "October 2026"
  rows: TrialHistoryRow[];
  total: number;
  converted: number;
  lost: number;
  stillOnTrial: number;
  rate: number; // converted / decided (0..1); decided = not still on trial
  byType: {
    coached30: { total: number; converted: number };
    kickstart21: { total: number; converted: number };
  };
}

interface CohortRow {
  email: string;
  full_name: string | null;
  trial_start: string | null;
  trial_end: string | null;
  trial_product: string | null;
  converted: boolean | null;
  converted_product: string | null;
  converted_at: string | null;
}
interface OutcomeRow {
  email: string;
  outcome: string | null;
  reason: string | null;
}

const MONTH_FMT = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

const lossLabel = (reason: string | null): string | null => {
  if (!reason) return null;
  return LOSS_REASONS.find((r) => r.key === reason)?.label ?? reason;
};

/** All trialists, grouped by the month their trial started (newest first). */
export async function getTrialHistory(): Promise<TrialHistoryMonth[]> {
  const [{ data: cRows }, { data: oRows }] = await Promise.all([
    supabase
      .from("trial_cohort")
      .select(
        "email, full_name, trial_start, trial_end, trial_product, converted, converted_product, converted_at",
      )
      .not("trial_start", "is", null),
    supabase.from("trial_outcomes").select("email, outcome, reason"),
  ]);

  const outcomeBy = new Map<string, OutcomeRow>();
  for (const o of (oRows as OutcomeRow[]) ?? []) {
    if (o?.email) outcomeBy.set(String(o.email).toLowerCase(), o);
  }

  const todayNum = Date.now();
  const months = new Map<string, TrialHistoryMonth>();

  for (const c of (cRows as CohortRow[]) ?? []) {
    if (!c.trial_start) continue;
    const start = new Date(c.trial_start + "T00:00:00");
    if (isNaN(start.getTime())) continue;
    const key = c.trial_start.slice(0, 7); // YYYY-MM

    const tType = trialType(c.trial_product);
    const outcome = outcomeBy.get(String(c.email).toLowerCase());
    const manualWon = outcome?.outcome === "won";
    const manualLost = outcome?.outcome === "lost";
    const isConverted = !!c.converted || manualWon;

    // trial window end (use stored end, else start + type length)
    const endNum = c.trial_end
      ? new Date(c.trial_end + "T00:00:00").getTime()
      : start.getTime() + trialLengthDays(tType) * 86400000;

    let state: TrialOutcomeState;
    if (isConverted) state = "converted";
    else if (manualLost) state = "lost";
    else if (todayNum > endNum) state = "not_converted";
    else state = "on_trial";

    const row: TrialHistoryRow = {
      email: c.email,
      name: c.full_name || c.email,
      trialType: tType,
      trialTypeLabel: tType === "kickstart21" ? "Kickstart 21" : "Coached 30",
      trialProduct: c.trial_product ?? null,
      trialStart: c.trial_start,
      state,
      convertedProduct: isConverted ? c.converted_product ?? null : null,
      convertedAt: isConverted ? c.converted_at ?? null : null,
      lossReason: manualLost ? lossLabel(outcome?.reason ?? null) : null,
    };

    let m = months.get(key);
    if (!m) {
      m = {
        key,
        label: MONTH_FMT.format(start),
        rows: [],
        total: 0,
        converted: 0,
        lost: 0,
        stillOnTrial: 0,
        rate: 0,
        byType: {
          coached30: { total: 0, converted: 0 },
          kickstart21: { total: 0, converted: 0 },
        },
      };
      months.set(key, m);
    }
    m.rows.push(row);
    m.total++;
    m.byType[tType].total++;
    if (state === "converted") {
      m.converted++;
      m.byType[tType].converted++;
    } else if (state === "lost") m.lost++;
    else if (state === "on_trial") m.stillOnTrial++;
  }

  // finalise: sort rows (converted first, then by start desc) + conversion rate
  const list = Array.from(months.values());
  for (const m of list) {
    const decided = m.total - m.stillOnTrial;
    m.rate = decided > 0 ? m.converted / decided : 0;
    m.rows.sort((a, b) => b.trialStart.localeCompare(a.trialStart));
  }
  // newest month first
  list.sort((a, b) => b.key.localeCompare(a.key));
  return list;
}
