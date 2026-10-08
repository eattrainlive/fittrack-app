import { supabase } from "./supabase";

export interface StaffMetric {
  key: string;
  value: number;
  label: string;
  group: string;
}

export interface StaffHubResponse {
  ok: boolean;
  generated: string;
  trusted?: boolean;
  month_name?: string;
  metrics: StaffMetric[];
  // Staff-only call lists (present only when the caller is verified staff)
  trialists?: Trialist[];
  reachout?: ReachoutMember[];
  lapsed?: LapsedMember[];
  actions?: StaffAction[];
}

export interface Trialist {
  first: string;
  last: string;
  email: string;
  start: string | null; // YYYY-MM-DD
  trial: string;
  category: string;
  finishes: string | null; // YYYY-MM-DD
}

export interface ReachoutMember {
  first: string;
  last: string;
  email: string;
  membership: string;
  category: string;
  joined: string | null; // YYYY-MM-DD
  milestone: number; // 3, 6, 9 or 12
}

export interface LapsedMember {
  first: string;
  last: string;
  email: string;
  membership: string;
  category: string;
  value: number; // monthly £
  cancelled: string | null; // YYYY-MM-DD
  window: string; // "2-3 months" | "4-6 months"
  stage: string;
  owner?: string;
}

export interface StaffAction {
  logged: string;
  type: "trialist" | "reachout" | "lapsed";
  who: string;
  email: string;
  outcome: string;
  note?: string;
  by: string;
}

export type StaffActionInput = Omit<StaffAction, "logged">;

/**
 * POST one or more outcome logs to the append-only log via the proxy.
 */
export async function logStaffActions(
  actions: StaffActionInput[],
): Promise<{ ok: boolean; logged?: number }> {
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
  const data = await res.json();
  return { ok: !!data?.ok, logged: data?.logged };
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

// Cache WITHOUT the PII lists — names/emails must never be persisted to localStorage.
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
 * Fetch the "This month" metrics from the Netlify proxy.
 * Sends the current Supabase access token as a Bearer header.
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
    setCachedMetrics(data);
  }
  return data;
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
