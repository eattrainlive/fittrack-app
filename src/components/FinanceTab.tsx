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
  FIN_PERIODS, type FinPeriod, type BankTxn, type Category, type ParsedRow,
} from "@/lib/finance";

type Sub = "pnl" | "transactions" | "upload";

export function FinanceTab() {
  const [sub, setSub] = useState<Sub>("pnl");
  const [period, setPeriod] = useState<FinPeriod>("this");
  const [cats, setCats] = useState<Category[]>([]);
  const [txns, setTxns] = useState<BankTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [breakEven, setBreakEven] = useState(0);
  const [beInput, setBeInput] = useState("");

  const kindOf = useCallback((name: string) => cats.find((c) => c.name === name)?.kind ?? "expense", [cats]);
  const range = finPeriodRange(period);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, t, s] = await Promise.all([listCategories(), listTransactions(range.from, range.to), getFinanceSettings()]);
      setCats(c); setTxns(t); setBreakEven(s.breakEvenMonthly); setBeInput(s.breakEvenMonthly ? String(s.breakEvenMonthly) : "");
    } catch (e: any) {
      toast.error(e.message || "Couldn't load finance data — did the finance SQL run?");
    } finally { setLoading(false); }
  }, [range.from, range.to]);
  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => financialTotals(txns, kindOf), [txns, kindOf]);
  const beTarget = breakEven * range.months;
  const vsBreakEven = beTarget > 0 ? totals.totalRevenue - beTarget : null;

  const saveBe = async () => {
    const val = Number(beInput) || 0;
    const res = await saveFinanceSettings({ breakEvenMonthly: val, ownerPayTarget: 0 });
    if (!res.ok) { toast.error(res.error || "Couldn't save"); return; }
    setBreakEven(val); toast.success("Break-even saved");
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
        <PnlView totals={totals} vsBreakEven={vsBreakEven} beTarget={beTarget} label={range.label}
                 beInput={beInput} setBeInput={setBeInput} saveBe={saveBe} onGoCode={() => setSub("transactions")} />
      ) : sub === "transactions" ? (
        <TxnTable txns={txns} cats={cats} onChanged={load} label={range.label} />
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

function PnlView({ totals, vsBreakEven, beTarget, label, beInput, setBeInput, saveBe, onGoCode }: any) {
  const rev = [...totals.revenue.entries()].sort((a: any, b: any) => b[1] - a[1]);
  const exp = [...totals.expenses.entries()].sort((a: any, b: any) => b[1] - a[1]);
  return (
    <div className="space-y-4">
      {totals.uncoded > 0 && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          {totals.uncoded} transaction{totals.uncoded > 1 ? "s" : ""} not categorised yet — they're excluded from these totals.
          <button className="ml-1 underline" onClick={onGoCode}>Categorise them</button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Revenue" value={gbp(totals.totalRevenue)} tone="text-emerald-600 dark:text-emerald-400" icon={TrendingUp} />
        <Tile label="Expenses" value={gbp(totals.totalExpenses)} tone="text-red-600 dark:text-red-400" icon={TrendingDown} />
        <Tile label="Net profit" value={gbp(totals.netProfit)}
              tone={totals.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} icon={PoundSterling} />
        <Tile label="Owner drawings" value={gbp(Math.abs(totals.owner))} icon={PoundSterling} />
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

function TxnTable({ txns, cats, onChanged, label }: { txns: BankTxn[]; cats: Category[]; onChanged: () => void; label: string }) {
  const uncoded = txns.filter((t) => t.status === "needs_review" && !t.excluded).length;
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">{txns.length} transactions · {label}</h3>
        {uncoded > 0 && <span className="text-xs text-amber-600 dark:text-amber-400">{uncoded} need categorising</span>}
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
