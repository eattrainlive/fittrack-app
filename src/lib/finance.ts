// Finance Phase 1 — bank transactions, categories and P&L totals.
// P&L maths ported from PT Genius (src/lib/financials.ts): a category is revenue/expense/
// owner; net profit = revenue − expenses. Owner drawings are tracked but sit outside profit.
import { supabase } from "@/lib/supabase";

export type CategoryKind = "revenue" | "expense" | "owner";
export type Site = "24hr" | "main" | "shared";
export const SITE_LABEL: Record<Site, string> = { "24hr": "24hr gym", main: "Main site", shared: "Shared" };
export interface Category { name: string; kind: CategoryKind; sort: number; default_site?: Site | null }

export interface BankTxn {
  id: string;
  txn_date: string;
  description: string | null;
  amount: number; // always positive
  direction: "in" | "out";
  category: string | null;
  status: "needs_review" | "coded";
  excluded: boolean;
  site: Site;
  import_batch: string | null;
}

// ── P&L maths ────────────────────────────────────────────────────────────────
export function cashAmount(t: Pick<BankTxn, "amount" | "direction">) {
  const a = Math.abs(Number(t.amount) || 0);
  return t.direction === "in" ? a : -a;
}
export function signedForKind(t: Pick<BankTxn, "amount" | "direction">, kind: CategoryKind) {
  // Revenue counts the inflow as positive; expenses/owner count the outflow as positive spend.
  return cashAmount(t) * (kind === "revenue" ? 1 : -1);
}

export interface PnlTotals {
  revenue: Map<string, number>;
  expenses: Map<string, number>;
  owner: number;
  uncoded: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

export function financialTotals(txns: BankTxn[], kindOf: (cat: string) => CategoryKind): PnlTotals {
  const revenue = new Map<string, number>();
  const expenses = new Map<string, number>();
  let owner = 0, uncoded = 0;
  for (const t of txns) {
    if (t.excluded) continue;
    const cat = (t.category || "").trim();
    if (!cat || t.status === "needs_review") { uncoded++; continue; }
    const kind = kindOf(cat);
    const amt = signedForKind(t, kind);
    if (kind === "owner") owner += amt;
    else {
      const b = kind === "revenue" ? revenue : expenses;
      b.set(cat, (b.get(cat) ?? 0) + amt);
    }
  }
  const totalRevenue = [...revenue.values()].reduce((a, b) => a + b, 0);
  const totalExpenses = [...expenses.values()].reduce((a, b) => a + b, 0);
  return { revenue, expenses, owner, uncoded, totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses };
}

export const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n || 0);
export const gbp2 = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n || 0);

// ── CSV parsing (handles common UK bank export shapes) ───────────────────────
export interface ParsedRow { txn_date: string; description: string; amount: number; direction: "in" | "out" }

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const toNum = (s: string) => Number(String(s).replace(/[£$,\s]/g, "")) || 0;

/** Day-first (UK) date → ISO, tolerant of d/m/y, d-m-y, and ISO already. */
function toISO(s: string): string | null {
  const t = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (!m) { const d = new Date(t); return isNaN(+d) ? null : d.toISOString().slice(0, 10); }
  let [, dd, mm, yy] = m;
  if (yy.length === 2) yy = "20" + yy;
  return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

/** Parse a bank CSV. Supports a single signed Amount column OR separate Paid-in/Paid-out
 *  (debit/credit) columns. Returns the rows it could read and how many it skipped. */
export function parseBankCsv(text: string): { rows: ParsedRow[]; skipped: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return { rows: [], skipped: 0 };
  const header = splitCsvLine(lines[0]).map(norm);
  const find = (...names: string[]) => header.findIndex((h) => names.some((n) => h === n || h.includes(n)));

  const iDate = find("date", "transactiondate", "postingdate");
  const iDesc = find("description", "details", "reference", "narrative", "memo", "payee");
  const iAmt = find("amount", "value");
  const iIn = find("paidin", "credit", "moneyin", "creditamount", "in");
  const iOut = find("paidout", "debit", "moneyout", "debitamount", "out");

  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const c = splitCsvLine(lines[i]);
    const iso = iDate >= 0 ? toISO(c[iDate]) : null;
    if (!iso) { skipped++; continue; }
    const desc = iDesc >= 0 ? c[iDesc] : "";
    let amount = 0, direction: "in" | "out" = "out";
    if (iIn >= 0 || iOut >= 0) {
      const inV = iIn >= 0 ? toNum(c[iIn]) : 0;
      const outV = iOut >= 0 ? toNum(c[iOut]) : 0;
      if (inV > 0) { amount = inV; direction = "in"; }
      else if (outV > 0) { amount = outV; direction = "out"; }
      else { skipped++; continue; }
    } else if (iAmt >= 0) {
      const v = toNum(c[iAmt]);
      if (v === 0) { skipped++; continue; }
      amount = Math.abs(v); direction = v >= 0 ? "in" : "out";
    } else { skipped++; continue; }
    rows.push({ txn_date: iso, description: desc, amount, direction });
  }
  return { rows, skipped };
}

// ── CRUD ─────────────────────────────────────────────────────────────────────
export async function listCategories(): Promise<Category[]> {
  const { data } = await supabase.from("transaction_categories").select("name, kind, sort, default_site").order("sort");
  return (data as Category[]) ?? [];
}

/** Expenses per site over the given transactions (costs of each unit). */
export function costsBySite(txns: BankTxn[], kindOf: (c: string) => CategoryKind): Record<Site, number> {
  const out: Record<Site, number> = { "24hr": 0, main: 0, shared: 0 };
  for (const t of txns) {
    if (t.excluded || !t.category || t.status === "needs_review") continue;
    if (kindOf(t.category) !== "expense") continue;
    out[t.site] += signedForKind(t, "expense");
  }
  return out;
}

export async function setSite(id: string, site: Site): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("bank_transactions").update({ site }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function listTransactions(fromISO?: string, toISO?: string): Promise<BankTxn[]> {
  let q = supabase.from("bank_transactions").select("*").order("txn_date", { ascending: false }).range(0, 9999);
  if (fromISO) q = q.gte("txn_date", fromISO);
  if (toISO) q = q.lte("txn_date", toISO);
  const { data } = await q;
  return (data as BankTxn[]) ?? [];
}

export async function importTransactions(rows: ParsedRow[]): Promise<{ ok: boolean; inserted: number; error?: string }> {
  const batch = `imp_${Date.now()}`;
  const payload = rows.map((r) => ({ ...r, status: "needs_review", import_batch: batch }));
  // Insert in chunks to stay under payload limits.
  let inserted = 0;
  for (let i = 0; i < payload.length; i += 500) {
    const { error, count } = await supabase
      .from("bank_transactions")
      .insert(payload.slice(i, i + 500), { count: "exact" });
    if (error) return { ok: false, inserted, error: error.message };
    inserted += count ?? payload.slice(i, i + 500).length;
  }
  return { ok: true, inserted };
}

export async function setCategory(id: string, category: string | null, site?: Site | null): Promise<{ ok: boolean; error?: string }> {
  const patch: any = { category, status: category ? "coded" : "needs_review" };
  if (site) patch.site = site; // apply the category's default site when provided
  const { error } = await supabase.from("bank_transactions").update(patch).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function setExcluded(id: string, excluded: boolean): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("bank_transactions").update({ excluded }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function addCategory(name: string, kind: CategoryKind): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("transaction_categories").insert({ name: name.trim(), kind, sort: 250 });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ── Break-even + revenue-source setting (feature_settings key 'finance') ──────
export type RevenueSource = "mrr" | "bank";
export interface FinanceSettings { breakEvenMonthly: number; ownerPayTarget: number; revenueSource: RevenueSource }
export async function getFinanceSettings(): Promise<FinanceSettings> {
  const { data } = await supabase.from("feature_settings").select("value").eq("key", "finance").maybeSingle();
  const v = (data?.value ?? {}) as any;
  return {
    breakEvenMonthly: Number(v.breakEvenMonthly) || 0,
    ownerPayTarget: Number(v.ownerPayTarget) || 0,
    revenueSource: v.revenueSource === "bank" ? "bank" : "mrr",
  };
}
export async function saveFinanceSettings(s: FinanceSettings): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("feature_settings")
    .upsert({ key: "finance", value: s, updated_at: new Date().toISOString() }, { onConflict: "key" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ── Auto-categorisation rules ────────────────────────────────────────────────
export interface TxnRule { id: string; match: string; category: string }
export async function listRules(): Promise<TxnRule[]> {
  const { data } = await supabase.from("transaction_rules").select("id, match, category").order("match");
  return (data as TxnRule[]) ?? [];
}
export async function addRule(match: string, category: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("transaction_rules").insert({ match: match.trim(), category });
  return error ? { ok: false, error: error.message } : { ok: true };
}
export async function deleteRule(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("transaction_rules").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Match a description against the rules; returns the category of the first match, else null. */
export function matchRule(description: string | null, rules: TxnRule[]): string | null {
  const d = (description || "").toLowerCase();
  if (!d) return null;
  for (const r of rules) {
    if (r.match && d.includes(r.match.toLowerCase())) return r.category;
  }
  return null;
}

/** Apply all rules to every uncoded, non-excluded transaction. Returns how many were coded. */
export async function applyRulesToUncoded(): Promise<{ coded: number; error?: string }> {
  const [rules, cats] = await Promise.all([listRules(), listCategories()]);
  if (!rules.length) return { coded: 0 };
  const siteOf = new Map(cats.map((c) => [c.name, c.default_site ?? null]));
  const { data } = await supabase
    .from("bank_transactions")
    .select("id, description")
    .eq("status", "needs_review")
    .eq("excluded", false)
    .range(0, 9999);
  let coded = 0;
  for (const t of data ?? []) {
    const cat = matchRule(t.description, rules);
    if (!cat) continue;
    const patch: any = { category: cat, status: "coded" };
    const ds = siteOf.get(cat);
    if (ds) patch.site = ds;
    const { error } = await supabase.from("bank_transactions").update(patch).eq("id", t.id);
    if (error) return { coded, error: error.message };
    coded++;
  }
  return { coded };
}

// ── Forecast (Phase 3) ───────────────────────────────────────────────────────
export interface ForecastPoint {
  month: string;       // "Jan 26"
  revenue: number;
  expenses: number;
  profit: number;
  cumulative: number;  // running total of profit
}

/** Average monthly expenses over the last `monthsBack` months, from categorised bank data. */
export async function recentMonthlyExpenses(kindOf: (c: string) => CategoryKind, monthsBack = 3): Promise<number> {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10); // end of last month
  const { data } = await supabase.from("bank_transactions").select("*")
    .gte("txn_date", from).lte("txn_date", to).range(0, 9999);
  const totals = financialTotals((data as BankTxn[]) ?? [], kindOf);
  return monthsBack > 0 ? totals.totalExpenses / monthsBack : 0;
}

/** Project revenue, expenses and profit forward. Revenue grows by a flat £/month; expenses held flat. */
export function buildForecast(opts: {
  startMrr: number;
  mrrGrowthPerMonth: number;
  monthlyExpenses: number;
  months: number;
}): ForecastPoint[] {
  const out: ForecastPoint[] = [];
  const now = new Date();
  let cumulative = 0;
  for (let i = 1; i <= opts.months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const revenue = Math.max(0, opts.startMrr + opts.mrrGrowthPerMonth * i);
    const expenses = opts.monthlyExpenses;
    const profit = revenue - expenses;
    cumulative += profit;
    out.push({
      month: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      revenue: Math.round(revenue),
      expenses: Math.round(expenses),
      profit: Math.round(profit),
      cumulative: Math.round(cumulative),
    });
  }
  return out;
}

/** Average month-on-month MRR change over the trend's last `window` steps. */
export function mrrGrowthFromTrend(trend: { mrr: number }[], window = 3): number {
  if (trend.length < 2) return 0;
  const pts = trend.slice(-(window + 1));
  if (pts.length < 2) return 0;
  let sum = 0, n = 0;
  for (let i = 1; i < pts.length; i++) { sum += pts[i].mrr - pts[i - 1].mrr; n++; }
  return n ? Math.round(sum / n) : 0;
}

// ── Period helpers (shared shape with KPIs) ──────────────────────────────────
export type FinPeriod = "this" | "last" | "3mo" | "12mo";
export const FIN_PERIODS: { key: FinPeriod; label: string }[] = [
  { key: "this", label: "This month" },
  { key: "last", label: "Last month" },
  { key: "3mo", label: "Last 3 months" },
  { key: "12mo", label: "Last 12 months" },
];
export function finPeriodRange(p: FinPeriod): { from: string; to: string; label: string; months: number } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (p === "this") return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)), label: "This month", months: 1 };
  if (p === "last") return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)), label: "Last month", months: 1 };
  const months = p === "3mo" ? 3 : 12;
  return { from: iso(new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)), label: p === "3mo" ? "Last 3 months" : "Last 12 months", months };
}
