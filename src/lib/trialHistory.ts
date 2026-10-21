import { supabase } from "@/lib/supabase";

/**
 * Trial history — reads the "Trial Conversions" tab of the 2026 KPIs Google
 * Sheet (via the staff-only /.netlify/functions/trial-history proxy) and groups
 * it by month. The sheet is the system of record for every trialist across the
 * year — what trial they did, whether they converted and onto what — so this is
 * a live mirror of it rather than the app's own partial trial_cohort.
 */

export type TrialOutcomeState = "converted" | "not_converted";

export interface TrialHistoryRow {
  email: string;
  name: string;
  trialType: string; // e.g. "21 Day Kickstart", "£1 First Month- Gym", "30 Day Trial"
  trialCategory: string; // "PT" | "Gym" | "Classes"
  trialStart: string; // as written in the sheet (dd/mm/yyyy)
  state: TrialOutcomeState;
  convertedOnto: string | null; // the membership they joined onto
  ontoCategory: string | null;
  conversionDate: string | null;
  source: string | null; // lead source — Meta / GoHighLevel / Walk-in / …
}

export interface TrialHistoryMonth {
  key: string; // "2026-01" (sortable)
  label: string; // "January 2026" (as in the sheet)
  rows: TrialHistoryRow[];
  total: number;
  converted: number;
  rate: number; // converted / total (0..1)
  byCategory: Record<string, { total: number; converted: number }>;
  bySource: Record<string, number>;
}

interface RawRow {
  month: string;
  firstName: string;
  lastName: string;
  email: string;
  trialStart: string;
  trialType: string;
  trialCategory: string;
  converted: boolean;
  convertedOnto: string;
  ontoCategory: string;
  conversionDate: string;
  source: string;
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** "January 2026" -> "2026-01" (sortable). Falls back to the raw label. */
function monthKey(label: string): string {
  const m = label.toLowerCase().match(/([a-z]+)\s+(\d{4})/);
  if (!m) return label;
  const idx = MONTHS.indexOf(m[1]);
  if (idx < 0) return label;
  return `${m[2]}-${String(idx + 1).padStart(2, "0")}`;
}

/** Fetch + group the KPI-sheet trial history by month (newest first). */
export async function getTrialHistory(): Promise<TrialHistoryMonth[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  const res = await fetch("/.netlify/functions/trial-history", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`trial-history ${res.status}`);
  const data = await res.json();
  if (!data?.ok || !Array.isArray(data.rows)) {
    throw new Error(data?.error || "bad response");
  }

  const months = new Map<string, TrialHistoryMonth>();
  for (const r of data.rows as RawRow[]) {
    const label = String(r.month || "").trim();
    if (!label) continue;
    const key = monthKey(label);
    const converted = !!r.converted;
    const name = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || r.email;
    const cat = (r.trialCategory || "—").trim() || "—";
    const source = (r.source || "").trim();

    const row: TrialHistoryRow = {
      email: r.email,
      name,
      trialType: r.trialType || "—",
      trialCategory: cat,
      trialStart: r.trialStart || "",
      state: converted ? "converted" : "not_converted",
      convertedOnto: converted ? r.convertedOnto || null : null,
      ontoCategory: converted ? r.ontoCategory || null : null,
      conversionDate: converted ? r.conversionDate || null : null,
      source: source || null,
    };

    let m = months.get(key);
    if (!m) {
      m = {
        key,
        label,
        rows: [],
        total: 0,
        converted: 0,
        rate: 0,
        byCategory: {},
        bySource: {},
      };
      months.set(key, m);
    }
    m.rows.push(row);
    m.total++;
    if (converted) m.converted++;
    if (!m.byCategory[cat]) m.byCategory[cat] = { total: 0, converted: 0 };
    m.byCategory[cat].total++;
    if (converted) m.byCategory[cat].converted++;
    if (source) m.bySource[source] = (m.bySource[source] ?? 0) + 1;
  }

  const list = Array.from(months.values());
  for (const m of list) {
    m.rate = m.total > 0 ? m.converted / m.total : 0;
    m.rows.sort((a, b) => a.name.localeCompare(b.name));
  }
  list.sort((a, b) => b.key.localeCompare(a.key)); // newest month first
  return list;
}
