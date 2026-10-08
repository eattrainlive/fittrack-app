import { supabase } from "./supabase";

export interface StaffMetric {
  key: string;
  value: number;
  label: string;
  group: string;
}

// ---- PII call lists (returned ONLY to verified staff by the proxy) ----

/** A current trialist whose trial has not yet been decided. */
export interface Trialist {
  first: string;
  last: string;
  email: string;
  start: string | null;
  trial: string;
  category: string;
  finishes: string | null;
}

/** A member hitting a 3/6/9/12-month milestone this month. */
export interface ReachoutMember {
  first: string;
  last: string;
  email: string;
  membership: string;
  category: string;
  joined: string | null;
  milestone: number;
}

/** A lapsed member in a priority win-back window. */
export interface LapsedMember {
  first: string;
  last: string;
  email: string;
  membership: string;
  category: string;
  value: number;
  cancelled: string | null;
  window: string;
  stage: string;
  owner: string;
}

/** A row logged to the Actions tab (history of what staff have done). */
export interface StaffAction {
  logged: string | null;
  type: string;
  who: string;
  email: string;
  outcome: string;
  note: string;
  by: string;
}

export interface StaffHubResponse {
  ok: boolean;
  generated: string;
  trusted?: boolean;
  month_name?: string;
  metrics: StaffMetric[];
  // Present only when the proxy verified the caller as staff:
  trialists?: Trialist[];
  reachout?: ReachoutMember[];
  lapsed?: LapsedMember[];
  actions?: StaffAction[];
}

const CACHE_KEY = "etl_staffhub_metrics_cache";

export function getCachedMetrics(): StaffHubResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StaffHubResponse;
  } catch {
    return null;
  }
}

/**
 * Cache the response WITHOUT the PII lists — names/emails must never be
 * persisted to localStorage. Only the (non-personal) metrics are cached so a
 * flaky-wifi refresh can still show numbers.
 */
function setCachedMetrics(res: StaffHubResponse) {
  try {
    const safe: StaffHubResponse = {
      ok: res.ok,
      generated: res.generated,
      trusted: res.trusted,
      month_name: res.month_name,
      metrics: res.metrics,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(safe));
  } catch {
    /* ignore */
  }
}

/**
 * Fetch the Staff Hub payload from the Netlify proxy. Sends the current
 * Supabase access token as a Bearer header. For a verified staff user the proxy
 * also returns the PII call lists (trialists / reachout / lapsed / actions);
 * for anyone else only `metrics` comes back. The lists are returned to the
 * caller but never written to the cache.
 */
export async function fetchStaffHubMetrics(): Promise<StaffHubResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? "";

  const res = await fetch("/.netlify/functions/staffhub", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Staff Hub fetch failed: ${res.status}`);
  }

  const data = (await res.json()) as StaffHubResponse;
  if (data && data.metrics) {
    setCachedMetrics(data); // metrics only — never the PII lists
  }
  return data;
}

/** One action to append to the Staff Hub Actions log. */
export interface StaffActionInput {
  type: string; // e.g. "trialist" | "reachout" | "lapsed"
  who: string; // member name
  email: string;
  outcome: string; // e.g. "Called – converting", "No answer", "Not interested"
  note?: string;
  by?: string; // staff member's name
}

/**
 * Log one or more staff actions (append-only) via the proxy. The proxy adds the
 * shared key server-side and only accepts POSTs from a verified staff user.
 * Returns the number of rows logged.
 */
export async function logStaffActions(
  actions: StaffActionInput[],
): Promise<{ ok: boolean; logged: number }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? "";

  const res = await fetch("/.netlify/functions/staffhub", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ actions }),
  });

  if (!res.ok) {
    throw new Error(`Staff Hub log failed: ${res.status}`);
  }
  return (await res.json()) as { ok: boolean; logged: number };
}

// ---- formatting helpers (display only; no maths on the raw values) ----

/** Rates (conv_*, attrition) arrive as decimals → show as %. */
export function formatRate(decimal: number): string {
  const pct = decimal * 100;
  // Show up to 2 decimals, trimming trailing zeros, e.g. 0.0084 → "0.84%"
  if (pct !== 0 && Math.abs(pct) < 1) {
    return `${pct.toFixed(2).replace(/\.?0+$/, "")}%`;
  }
  return `${Math.round(pct)}%`;
}

/** Keys ending in `_value` are pounds. Round for display only. */
export function formatPounds(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}£${Math.abs(rounded).toLocaleString("en-GB")}`;
}

/** A plain number with thousands separators. */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-GB");
}

/** net_members can be negative — show the sign. */
export function formatSigned(value: number): string {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

/** Decide how to display a metric value based on its key. */
export function formatMetricValue(key: string, value: number): string {
  if (key.endsWith("_value")) return formatPounds(value);
  if (key.startsWith("conv_") || key === "attrition") return formatRate(value);
  if (key === "net_members") return formatSigned(value);
  return formatNumber(value);
}

/** Localised "last updated" from the generated timestamp. */
export function formatGenerated(generated: string): string {
  try {
    return new Date(generated).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return generated;
  }
}
