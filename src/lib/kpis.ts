// Gym business KPIs for the staff "Numbers" tab. Metric definitions are ported from the
// PT Genius dashboard so the figures line up: MRR, average fee, retention, churn, new vs
// lost, net movement, paused — plus at-risk from the retention engine.
import { supabase } from "@/lib/supabase";
import { getRetentionBoard } from "@/lib/retentionNurture";

export type KpiStatus = "active" | "paused" | "lost";

export interface KpiMember {
  monthly_fee: number;
  status: KpiStatus;
  start_date: string | null; // joined_on
  end_date: string | null; // when they left (ended_on / scheduled end / manual-left)
}

export interface KpiMetrics {
  active: number;
  paused: number;
  lost: number;
  mrr: number;
  pausedMrr: number;
  avgFee: number;
  retention: number | null;
  churn: number | null;
  activeAtStart: number;
  lostInPeriod: number;
  wonInPeriod: number;
  netMovement: number;
}

// ── Metric engine (ported from PT Genius src/lib/metrics.ts) ──────────────────
export function computeMetrics(members: KpiMember[], from: Date, to: Date): KpiMetrics {
  const active = members.filter((m) => m.status === "active");
  const paused = members.filter((m) => m.status === "paused");
  const lost = members.filter((m) => m.status === "lost");

  const inPeriod = (d: string | null) => {
    if (!d) return false;
    const dt = new Date(d);
    return dt >= from && dt <= to;
  };

  // Members active at the START of the period: joined before it, hadn't left before it,
  // and aren't paused.
  const startCohort = members.filter((m) => {
    if (m.status === "paused") return false;
    if (!m.start_date) return false;
    if (new Date(m.start_date) >= from) return false;
    if (m.end_date && new Date(m.end_date) < from) return false;
    return true;
  });

  const activeAtStart = startCohort.length;
  const lostInPeriod = startCohort.filter((m) => inPeriod(m.end_date)).length;
  const wonInPeriod = members.filter((m) => inPeriod(m.start_date)).length;

  const mrr = active.reduce((s, m) => s + Number(m.monthly_fee || 0), 0);
  const pausedMrr = paused.reduce((s, m) => s + Number(m.monthly_fee || 0), 0);
  const churn = activeAtStart > 0 ? (lostInPeriod / activeAtStart) * 100 : null;

  return {
    active: active.length,
    paused: paused.length,
    lost: lost.length,
    mrr,
    pausedMrr,
    avgFee: active.length > 0 ? mrr / active.length : 0,
    retention: churn === null ? null : 100 - churn,
    churn,
    activeAtStart,
    lostInPeriod,
    wonInPeriod,
    netMovement: wonInPeriod - lostInPeriod,
  };
}

// ── Formatting ───────────────────────────────────────────────────────────────
export const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n || 0);
export const gbp2 = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n || 0);
export const pct = (n: number | null) => (n === null ? "—" : `${(n || 0).toFixed(1)}%`);

export function monthRange(monthsBack = 0) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const to = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 0, 23, 59, 59);
  return { from, to };
}

export type KpiPeriod = "this" | "last" | "3mo" | "12mo";
export const PERIODS: { key: KpiPeriod; label: string }[] = [
  { key: "this", label: "This month" },
  { key: "last", label: "Last month" },
  { key: "3mo", label: "Last 3 months" },
  { key: "12mo", label: "Last 12 months" },
];
export function periodRange(p: KpiPeriod): { from: Date; to: Date; label: string } {
  if (p === "this") return { ...monthRange(0), label: "This month" };
  if (p === "last") return { ...monthRange(1), label: "Last month" };
  const now = new Date();
  const months = p === "3mo" ? 3 : 12;
  const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { from, to, label: p === "3mo" ? "Last 3 months" : "Last 12 months" };
}

// ── Roster → KPI members ─────────────────────────────────────────────────────
const normPlan = (s?: string | null) => String(s || "").trim().toLowerCase();

interface RosterRow {
  status: string | null;
  product: string | null;
  joined_on: string | null;
  ended_on: string | null;
  end_date: string | null;
  manual_inactive_at: string | null;
}

/** Map one roster row to a KPI member, or null to exclude (unknown/pending — ambiguous). */
function toKpiMember(r: RosterRow, priceFor: (p: string | null) => number): KpiMember | null {
  const today = new Date().toISOString().slice(0, 10);
  const st = String(r.status || "").toLowerCase();
  const leftDate =
    r.ended_on || r.end_date || (r.manual_inactive_at ? r.manual_inactive_at.slice(0, 10) : null);
  const expired = !!r.end_date && r.end_date < today;
  const isLost = !!r.manual_inactive_at || st === "cancelled" || expired;

  let status: KpiStatus;
  if (isLost) status = "lost";
  else if (st === "paused") status = "paused";
  else if (st === "active") status = "active";
  else return null; // unknown / pending_review — don't count either way

  return {
    monthly_fee: priceFor(r.product),
    status,
    start_date: r.joined_on,
    end_date: isLost ? leftDate : null,
  };
}

export interface KpiData {
  metrics: KpiMetrics;
  atRisk: number | null;
  atRiskMrr: number | null;
  priceCoverage: number; // share of active members that have a plan price (0..1)
}

/** Load the roster + plan prices, compute all KPIs for the chosen period. */
export async function loadKpis(period: KpiPeriod, staffSecret?: string): Promise<KpiData> {
  const [rosterRes, pricesRes] = await Promise.all([
    supabase
      .from("gym_members")
      .select("status, product, joined_on, ended_on, end_date, manual_inactive_at")
      .range(0, 9999),
    supabase.from("membership_plan_prices").select("plan_name, monthly_price"),
  ]);

  const priceMap = new Map<string, number>();
  for (const p of pricesRes.data ?? []) priceMap.set(normPlan(p.plan_name), Number(p.monthly_price) || 0);
  const priceFor = (p: string | null) => priceMap.get(normPlan(p)) ?? 0;

  const members: KpiMember[] = [];
  for (const r of (rosterRes.data ?? []) as RosterRow[]) {
    const km = toKpiMember(r, priceFor);
    if (km) members.push(km);
  }

  const { from, to } = periodRange(period);
  const metrics = computeMetrics(members, from, to);

  const activeWithPrice = members.filter((m) => m.status === "active" && m.monthly_fee > 0).length;
  const priceCoverage = metrics.active > 0 ? activeWithPrice / metrics.active : 1;

  // At-risk from the retention engine (optional — staff-only, non-blocking).
  let atRisk: number | null = null;
  let atRiskMrr: number | null = null;
  if (staffSecret) {
    try {
      const { members: board } = await getRetentionBoard(staffSecret, 30);
      const risky = board.filter((m) => m.band === "at-risk");
      atRisk = risky.length;
      atRiskMrr = risky.reduce((s, m) => s + priceFor(m.membership), 0);
    } catch {
      /* leave null — board not critical to the KPI view */
    }
  }

  return { metrics, atRisk, atRiskMrr, priceCoverage };
}

// ── Plan price editor support ────────────────────────────────────────────────
export async function listPlans(): Promise<{ plan_name: string; monthly_price: number; count: number }[]> {
  const [rosterRes, pricesRes] = await Promise.all([
    supabase.from("gym_members").select("product, status").range(0, 9999),
    supabase.from("membership_plan_prices").select("plan_name, monthly_price"),
  ]);
  const priceMap = new Map<string, number>();
  for (const p of pricesRes.data ?? []) priceMap.set(normPlan(p.plan_name), Number(p.monthly_price) || 0);

  // Count ACTIVE members per plan name (so staff price the plans that matter first).
  const counts = new Map<string, { name: string; count: number }>();
  for (const r of rosterRes.data ?? []) {
    const name = String(r.product || "").trim();
    if (!name) continue;
    if (String(r.status).toLowerCase() !== "active") continue;
    const key = normPlan(name);
    const cur = counts.get(key) ?? { name, count: 0 };
    cur.count++;
    counts.set(key, cur);
  }
  return Array.from(counts.values())
    .map((c) => ({ plan_name: c.name, monthly_price: priceMap.get(normPlan(c.name)) ?? 0, count: c.count }))
    .sort((a, b) => b.count - a.count || a.plan_name.localeCompare(b.plan_name));
}

export async function savePlanPrice(plan_name: string, monthly_price: number): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("membership_plan_prices")
    .upsert({ plan_name, monthly_price, updated_at: new Date().toISOString() }, { onConflict: "plan_name" });
  return error ? { ok: false, error: error.message } : { ok: true };
}
