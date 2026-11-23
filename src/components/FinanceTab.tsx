// Finance tab (Phase 1): P&L, Transactions and bank-statement Upload.
// Revenue − expenses = net profit, compared to a break-even target. Owner drawings shown
// separately. Built on the member/revenue KPIs that live in the Numbers tab.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Upload, PoundSterling, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  listCategories, listTransactions, importTransactions, parseBankCsv, setCategory, setExcluded,
  financialTotals, getFinanceSettings, saveFinanceSettings, finPeriodRange, gbp, gbp2,
  listRules, addRule, deleteRule, applyRulesToUncoded,
  FIN_PERIODS, type FinPeriod, type BankTxn, type Category, type ParsedRow,
  type RevenueSource, type TxnRule,
} from "@/lib/finance";
import { loadKpis } from "@/lib/kpis";

type Sub = "pnl" | "transactions" | "upload";

// Period → which of the 12 trend months to sum for MRR revenue.
function periodMrr(trend: { month: string; mrr: number }[], period: FinPeriod): number {
  if (!trend.length) return 0;
  const last = trend[trend.length - 1];
  if (period === "this") return last.mrr;
  if (period === "last") return trend.length >= 2 ? trend[trend.length - 2].mrr : 0;
  const n = period === "3mo" ? 3 : 12;
  return trend.slice(-n).reduce((a, b) => a + b.mrr, 0);
}

export function FinanceTab({ staffSecret }: { staffSecret: string }) {
  const [sub, setSub] = useState<Sub>("pnl");
  const [period, setPeriod] = useState<FinPeriod>("this");
  const [cats, setCats] = useState<Category[]>([]);
  const [txns, setTxns] = useState<BankTxn[]>([]);
  const [rules, setRules] = useState<TxnRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [breakEven, setBreakEven] = useState(0);
  const [beInput, setBeInput] = useState("");
  const [revSource, setRevSource] = useState<RevenueSource>("mrr");
  const [mrrRevenue, setMrrRevenue] = useState(0);

  const kindOf = useCallback((name: string) => cats.find((c) => c.name === name)?.kind ?? "expense", [cats]);
  const range = finPeriodRange(period);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, t, s, r] = await Promise.all([
        listCategories(), listTransactions(range.from, range.to), getFinanceSettings(), listRules(),
      ]);
      setCats(c); setTxns(t); setRules(r);
      setBreakEven(s.breakEvenMonthly); setBeInput(s.breakEvenMonthly ? String(s.breakEvenMonthly) : "");
      setRevSource(s.revenueSource);
      try {
        const kpi = await loadKpis(period, staffSecret);
        setMrrRevenue(periodMrr(kpi.trend, period));
      } catch { setMrrRevenue(0); }
    } catch (e: any) {
      toast.error(e.message || "Couldn't load finance data — did the finance SQL run?");
    } finally { setLoading(false); }
  }, [range.from, range.to, period, staffSecret]);
  useEffect(() => { load(); }, [load]);

  const bankTotals = useMemo(() => financialTotals(txns, kindOf), [txns, kindOf]);
  // In MRR mode the revenue line comes from memberships, not bank credits; expenses still bank.
  const revenueTotal = revSource === "mrr" ? mrrRevenue : bankTotals.totalRevenue;
  const netProfit = revenueTotal - bankTotals.totalExpenses;
  const beTarget = breakEven * range.months;
  const vsBreakEven = beTarget > 0 ? revenueTotal - beTarget : null;

  const saveBe = async () => {
    const val = Number(beInput) || 0;
    const res = await saveFinanceSettings({ breakEvenMonthly: val, ownerPayTarget: 0, revenueSource: revSource });
    if (!res.ok) { toast.error(res.error || "Couldn't save"); return; }
    setBreakEven(val); toast.success("Break-even saved");
  };
  const changeRevSource = async (src: RevenueSource) => {
    setRevSource(src);
    await saveFinanceSettings({ breakEvenMonthly: breakEven, ownerPayTarget: 0, revenueSource: src });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><PoundSterling className="h-5 w-5" /> Finance</h2>
          <p className="text-xs text-muted-foreground">Profit &amp; loss from your bank statement.</p>
        </div>
        <div className="flex gap-1.5">
          {(["pnl", "transactions", "upload"] as Sub[]).map((s) => (
            <button key={s} onClick={() => setSub(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                sub === s ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"}`}>
              {s === "pnl" ? "P&L" : s === "transactions" ? "Transactions" : "Upload"}
            </button>
          ))}
        </div>
      </div>

      {sub !== "upload" && (
        <div className="flex gap-1.5 flex-wrap">
          {FIN_PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                period === p.key ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"}`}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : sub === "pnl" ? (
        <PnlView bankTotals={bankTotals} revenueTotal={revenueTotal} netProfit={netProfit}
                 revSource={revSource} changeRevSource={changeRevSource}
                 vsBreakEven={vsBreakEven} beTarget={beTarget} label={range.label}
                 beInput={beInput} setBeInput={setBeInput} saveBe={saveBe} onGoCode={() => setSub("transactions")} />
      ) : sub === "transactions" ? (
        <TxnTable txns={txns} cats={cats} rules={rules} onChanged={load} label={range.label} />
      ) : (
        <UploadView onImported={load} />
      )}
    </div>
  );
}

function Tile({ label, value, tone, icon: Icon }: { label: string; value: string; tone?: string; icon?: any }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{Icon && <Icon className="h-3.5 w-3.5" />} {label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${tone || ""}`}>{value}</div>
    </div>
  );
}

function PnlView({ bankTotals, revenueTotal, netProfit, revSource, changeRevSource, vsBreakEven, beTarget, label, beInput, setBeInput, saveBe, onGoCode }: any) {
  const exp = [...bankTotals.expenses.entries()].sort((a: any, b: any) => b[1] - a[1]);
  const rev = revSource === "mrr"
    ? [["Membership revenue (MRR)", revenueTotal] as [string, number]]
    : [...bankTotals.revenue.entries()].sort((a: any, b: any) => b[1] - a[1]);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Revenue from:</span>
        {(["mrr", "bank"] as RevenueSource[]).map((s) => (
          <button key={s} onClick={() => changeRevSource(s)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition ${
              revSource === s ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"}`}>
            {s === "mrr" ? "Membership MRR" : "Bank credits"}
          </button>
        ))}
        <span className="text-[11px] text-muted-foreground">
          {revSource === "mrr" ? "Revenue = recurring membership income; no need to import payments." : "Revenue = bank transactions tagged as income."}
        </span>
      </div>

      {bankTotals.uncoded > 0 && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          {bankTotals.uncoded} transaction{bankTotals.uncoded > 1 ? "s" : ""} not categorised yet — excluded from expenses.
          <button className="ml-1 underline" onClick={onGoCode}>Categorise them</button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Revenue" value={gbp(revenueTotal)} tone="text-emerald-600 dark:text-emerald-400" icon={TrendingUp} />
        <Tile label="Expenses" value={gbp(bankTotals.totalExpenses)} tone="text-red-600 dark:text-red-400" icon={TrendingDown} />
        <Tile label="Net profit" value={gbp(netProfit)}
              tone={netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} icon={PoundSterling} />
        <Tile label="Owner drawings" value={gbp(Math.abs(bankTotals.owner))} icon={PoundSterling} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs font-medium text-muted-foreground">Break-even ({label.toLowerCase()})</div>
          <div className={`text-lg font-bold ${vsBreakEven === null ? "" : vsBreakEven >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {vsBreakEven === null ? "Set a target →"
              : `${gbp(Math.abs(vsBreakEven))} ${vsBreakEven >= 0 ? "above" : "below"} break-even (${gbp(beTarget)})`}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">£</span>
          <input type="number" min={0} value={beInput} onChange={(e) => setBeInput(e.target.value)}
                 placeholder="monthly" className="w-28 rounded-md border border-border bg-background px-2 py-1 text-sm" />
          <span className="text-xs text-muted-foreground">/mo</span>
          <Button size="sm" variant="outline" onClick={saveBe}>Save</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Breakdown title="Revenue" rows={rev} tone="text-emerald-600 dark:text-emerald-400" />
        <Breakdown title="Expenses" rows={exp} tone="text-red-600 dark:text-red-400" />
      </div>
    </div>
  );
}

function Breakdown({ title, rows, tone }: { title: string; rows: [string, number][]; tone: string }) {
  const total = rows.reduce((a, b) => a + b[1], 0);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {rows.length === 0 ? <p className="text-xs text-muted-foreground">Nothing categorised here yet.</p> : (
        <div className="space-y-1">
          {rows.map(([name, amt]) => (
            <div key={name} className="flex items-center justify-between text-sm">
              <span className="truncate">{name}</span>
              <span className="tabular-nums text-muted-foreground">{gbp2(amt)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm font-semibold border-t border-border pt-1 mt-1">
            <span>Total</span><span className={`tabular-nums ${tone}`}>{gbp2(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TxnTable({ txns, cats, rules, onChanged, label }: { txns: BankTxn[]; cats: Category[]; rules: TxnRule[]; onChanged: () => void; label: string }) {
  const uncoded = txns.filter((t) => t.status === "needs_review" && !t.excluded).length;
  const [busy, setBusy] = useState(false);
  const autoCat = async () => {
    setBusy(true);
    const res = await applyRulesToUncoded();
    setBusy(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success(res.coded ? `Auto-categorised ${res.coded}` : "No uncoded transactions matched a rule");
    if (res.coded) onChanged();
  };
  return (
    <div className="space-y-3">
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <h3 className="text-sm font-semibold">{txns.length} transactions · {label}</h3>
        <div className="flex items-center gap-2">
          {uncoded > 0 && <span className="text-xs text-amber-600 dark:text-amber-400">{uncoded} need categorising</span>}
          <Button size="sm" variant="outline" disabled={busy || !rules.length} onClick={autoCat}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Auto-categorise"}
          </Button>
        </div>
      </div>
      <div className="space-y-1 max-h-[600px] overflow-auto">
        {txns.map((t) => (
          <div key={t.id} className={`flex items-center gap-2 text-sm py-1 border-b border-border/50 ${t.excluded ? "opacity-40" : ""}`}>
            <span className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">{t.txn_date.slice(5)}</span>
            <span className="flex-1 truncate">{t.description || "—"}</span>
            <span className={`w-24 shrink-0 text-right tabular-nums ${t.direction === "in" ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
              {t.direction === "in" ? "+" : "−"}{gbp2(t.amount)}
            </span>
            <select
              value={t.category ?? ""}
              onChange={async (e) => { const r = await setCategory(t.id, e.target.value || null); if (!r.ok) toast.error(r.error || "Failed"); else onChanged(); }}
              className="w-44 shrink-0 rounded-md border border-border bg-background px-1.5 py-1 text-xs"
            >
              <option value="">— uncategorised —</option>
              {cats.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <button title={t.excluded ? "Include" : "Exclude"}
              onClick={async () => { const r = await setExcluded(t.id, !t.excluded); if (!r.ok) toast.error(r.error || "Failed"); else onChanged(); }}
              className="shrink-0 text-xs text-muted-foreground hover:underline">
              {t.excluded ? "include" : "exclude"}
            </button>
          </div>
        ))}
        {txns.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No transactions in this period. Upload a bank statement to start.</p>}
      </div>
    </div>
    <RulesPanel cats={cats} rules={rules} onChanged={onChanged} />
    </div>
  );
}

function RulesPanel({ cats, rules, onChanged }: { cats: Category[]; rules: TxnRule[]; onChanged: () => void }) {
  const [match, setMatch] = useState("");
  const [cat, setCat] = useState("");
  const add = async () => {
    if (!match.trim() || !cat) { toast.error("Enter a keyword and category"); return; }
    const res = await addRule(match, cat);
    if (!res.ok) { toast.error(res.error || "Failed"); return; }
    setMatch(""); setCat(""); toast.success("Rule added — hit Auto-categorise to apply");
    onChanged();
  };
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <h3 className="text-sm font-semibold">Auto-categorise rules</h3>
      <p className="text-[11px] text-muted-foreground">When a transaction's description contains the keyword, it's tagged with that category. e.g. "TESCO" → Stock &amp; supplies.</p>
      <div className="flex items-center gap-2 flex-wrap">
        <input value={match} onChange={(e) => setMatch(e.target.value)} placeholder="keyword in description"
               className="flex-1 min-w-[140px] rounded-md border border-border bg-background px-2 py-1 text-sm" />
        <select value={cat} onChange={(e) => setCat(e.target.value)}
                className="rounded-md border border-border bg-background px-1.5 py-1 text-sm">
          <option value="">— category —</option>
          {cats.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <Button size="sm" variant="outline" onClick={add}>Add rule</Button>
      </div>
      {rules.length > 0 && (
        <div className="space-y-1 pt-1">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-xs">
              <span className="font-mono bg-muted/50 rounded px-1.5 py-0.5">{r.match}</span>
              <span className="text-muted-foreground">→ {r.category}</span>
              <button className="ml-auto text-muted-foreground hover:text-red-600 hover:underline"
                onClick={async () => { const res = await deleteRule(r.id); if (!res.ok) toast.error(res.error || "Failed"); else onChanged(); }}>
                remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadView({ onImported }: { onImported: () => void }) {
  const [parsed, setParsed] = useState<{ rows: ParsedRow[]; skipped: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");

  const onFile = async (f: File) => {
    setFileName(f.name);
    const text = await f.text();
    const res = parseBankCsv(text);
    setParsed(res);
    if (!res.rows.length) toast.error("Couldn't read any rows — check it's a CSV with a date and amount column.");
  };

  const doImport = async () => {
    if (!parsed?.rows.length) return;
    setBusy(true);
    const res = await importTransactions(parsed.rows);
    setBusy(false);
    if (!res.ok) { toast.error(res.error || "Import failed"); return; }
    toast.success(`Imported ${res.inserted} transactions`);
    setParsed(null); setFileName(""); onImported();
  };

  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-6 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold"><Upload className="h-4 w-4" /> Upload bank statement (CSV)</div>
      <p className="text-xs text-muted-foreground">
        Export your bank transactions as CSV. We read the date, description and amount — whether it's a single
        signed amount column or separate paid-in / paid-out columns.
      </p>
      <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
             className="block text-sm" />
      {parsed && (
        <div className="rounded-lg border border-border bg-background p-3 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{fileName}</span>
            <span className="text-muted-foreground">· {parsed.rows.length} rows ready{parsed.skipped ? `, ${parsed.skipped} skipped` : ""}</span>
          </div>
          {parsed.rows.slice(0, 4).map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-20 tabular-nums">{r.txn_date}</span>
              <span className="flex-1 truncate">{r.description}</span>
              <span className="tabular-nums">{r.direction === "in" ? "+" : "−"}{gbp2(r.amount)}</span>
            </div>
          ))}
          <Button size="sm" disabled={busy} onClick={doImport} className="gap-1">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Import {parsed.rows.length} transactions
          </Button>
        </div>
      )}
      {parsed && <p className="text-amber-600/80 dark:text-amber-400/80 text-[11px]">
        Imported transactions arrive uncategorised — tag them under Transactions and the P&L fills in.
      </p>}
    </div>
  );
}

export default FinanceTab;
