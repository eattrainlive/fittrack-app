// 24hr gym fob/door usage — Paxton access-log import + usage stats + value attribution.
import { supabase } from "@/lib/supabase";

export type FobMethod = "token" | "code" | "pin" | "other";
export interface FobEntry {
  id?: string;
  ts: string;
  user_name: string | null;
  token_number: string | null;
  location: string | null;
  event: string | null;
  method: FobMethod;
  granted: boolean;
}

// ── Paxton CSV parsing ───────────────────────────────────────────────────────
function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
const normKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** "27/09/2026 23:17:13" (day-first) → ISO timestamp. */
function toISOStamp(s: string): string | null {
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) { const d = new Date(s); return isNaN(+d) ? null : d.toISOString(); }
  let [, dd, mm, yy, hh, mi, ss] = m;
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${hh.padStart(2, "0")}:${mi}:${(ss || "00").padStart(2, "0")}`;
}

function methodFromEvent(ev: string): FobMethod {
  const e = ev.toLowerCase();
  if (e.includes("token")) return "token";
  if (e.includes("code")) return "code";
  if (e.includes("pin")) return "pin";
  return "other";
}

/** Parse a Paxton door log. Keeps only ACCESS events (permitted/denied), skips door-open/bell. */
export function parseFobCsv(text: string): { rows: FobEntry[]; skipped: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return { rows: [], skipped: 0 };
  const header = splitCsvLine(lines[0]).map(normKey);
  const col = (...names: string[]) => header.findIndex((h) => names.some((n) => h === n || h.includes(n)));
  const iTs = col("datetime", "date"), iUser = col("user"), iToken = col("tokennumber", "token"),
        iWhere = col("where", "location"), iEvent = col("event");

  const rows: FobEntry[] = []; let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const c = splitCsvLine(lines[i]);
    const ev = iEvent >= 0 ? c[iEvent] : "";
    const el = ev.toLowerCase();
    if (!el.includes("access")) { skipped++; continue; }           // door opened / bell → not an entry
    const ts = iTs >= 0 ? toISOStamp(c[iTs]) : null;
    if (!ts) { skipped++; continue; }
    const rawUser = iUser >= 0 ? c[iUser].trim() : "";
    const user = !rawUser || rawUser.toLowerCase() === "unknown" ? null : rawUser;
    rows.push({
      ts, user_name: user,
      token_number: iToken >= 0 ? (c[iToken] || null) : null,
      location: iWhere >= 0 ? (c[iWhere] || null) : null,
      event: ev, method: methodFromEvent(ev),
      granted: el.includes("permitted") || el.includes("granted"),
    });
  }
  return { rows, skipped };
}

export async function importFobEntries(rows: FobEntry[]): Promise<{ ok: boolean; inserted: number; error?: string }> {
  const batch = `fob_${Date.now()}`;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map((r) => ({ ...r, import_batch: batch }));
    const { error, count } = await supabase
      .from("fob_entries")
      .upsert(chunk, { onConflict: "ts,user_name,location", ignoreDuplicates: true, count: "exact" });
    if (error) return { ok: false, inserted, error: error.message };
    inserted += count ?? 0;
  }
  return { ok: true, inserted };
}

// ── Stats + value attribution ────────────────────────────────────────────────
export interface FobUser { name: string; entries: number; member: string | null; fee: number }
export interface FobStats {
  totalEntries: number;
  grantedEntries: number;
  uniqueUsers: number;
  codeOnlyEntries: number;
  codeOnlyShare: number;       // 0..1
  byUser: FobUser[];
  byHour: { hour: string; entries: number }[];
  attributedRevenue: number;   // sum of matched members' fees
  matchedUsers: number;
  days: number;
}

// Paxton "Last, First" → "first last"; also handle "First Last" already.
function normName(s: string): string {
  let n = s.trim();
  if (n.includes(",")) { const [last, first] = n.split(",", 2); n = `${first} ${last}`; }
  return n.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Load fob entries for a period + match named users to members → attribute fee value. */
export async function fobStats(fromISO: string, toISO: string): Promise<FobStats> {
  const [entriesRes, membersRes, pricesRes] = await Promise.all([
    supabase.from("fob_entries").select("ts, user_name, method, granted").gte("ts", fromISO).lte("ts", toISO).range(0, 99999),
    supabase.from("gym_members").select("full_name, product, status").range(0, 9999),
    supabase.from("membership_plan_prices").select("plan_name, monthly_price"),
  ]);
  const entries = entriesRes.data ?? [];
  const granted = entries.filter((e: any) => e.granted);

  // member name → product, price map
  const priceMap = new Map<string, number>();
  for (const p of pricesRes.data ?? []) priceMap.set(String(p.plan_name).trim().toLowerCase(), Number(p.monthly_price) || 0);
  const memberByName = new Map<string, { product: string | null }>();
  for (const m of membersRes.data ?? []) {
    if (String(m.status).toLowerCase() === "cancelled") continue;
    const nn = normName(String(m.full_name || ""));
    if (nn) memberByName.set(nn, { product: m.product });
  }

  const userCounts = new Map<string, number>();
  let codeOnly = 0;
  const hourCounts = new Array(24).fill(0);
  for (const e of granted) {
    const d = new Date(e.ts); if (!isNaN(+d)) hourCounts[d.getHours()]++;
    if (!e.user_name || e.method === "code") { codeOnly++; if (!e.user_name) continue; }
    const key = String(e.user_name).trim();
    userCounts.set(key, (userCounts.get(key) ?? 0) + 1);
  }

  const byUser: FobUser[] = [];
  let attributedRevenue = 0, matchedUsers = 0;
  for (const [name, entries] of userCounts) {
    const m = memberByName.get(normName(name));
    const fee = m ? (priceMap.get(String(m.product || "").trim().toLowerCase()) ?? 0) : 0;
    if (m) { matchedUsers++; attributedRevenue += fee; }
    byUser.push({ name, entries, member: m ? name : null, fee });
  }
  byUser.sort((a, b) => b.entries - a.entries);

  const from = new Date(fromISO), to = new Date(toISO);
  const days = Math.max(1, Math.round((+to - +from) / 86400000));

  return {
    totalEntries: entries.length,
    grantedEntries: granted.length,
    uniqueUsers: userCounts.size,
    codeOnlyEntries: codeOnly,
    codeOnlyShare: granted.length ? codeOnly / granted.length : 0,
    byUser,
    byHour: hourCounts.map((entries, h) => ({ hour: `${String(h).padStart(2, "0")}`, entries })),
    attributedRevenue,
    matchedUsers,
    days,
  };
}

export async function fobDateBounds(): Promise<{ min: string | null; max: string | null }> {
  const [a, b] = await Promise.all([
    supabase.from("fob_entries").select("ts").order("ts", { ascending: true }).limit(1),
    supabase.from("fob_entries").select("ts").order("ts", { ascending: false }).limit(1),
  ]);
  return { min: a.data?.[0]?.ts ?? null, max: b.data?.[0]?.ts ?? null };
}
