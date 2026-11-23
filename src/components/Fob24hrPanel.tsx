// 24hr gym unit view: fob usage (Paxton import) + attributed membership revenue vs 24hr
// site costs = is the unit profitable. Built on fob_entries + the finance site-split.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Users, DoorOpen, PoundSterling, KeyRound, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { fobStatsLive, liveFobBounds, type FobStats } from "@/lib/fob";
import { listTransactions, listCategories, costsBySite, finPeriodRange, gbp, gbp2, FIN_PERIODS, type FinPeriod, type CategoryKind } from "@/lib/finance";

type Period = FinPeriod | "all";

function Tile({ label, value, tone, icon: Icon, hint }: { label: string; value: string; tone?: string; icon?: any; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{Icon && <Icon className="h-3.5 w-3.5" />} {label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${tone || ""}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Fob24hrPanel() {
  const [period, setPeriod] = useState<Period>("all");
  const [stats, setStats] = useState<FobStats | null>(null);
  const [cost24, setCost24] = useState(0);
  const [bounds, setBounds] = useState<{ min: string | null; max: string | null }>({ min: null, max: null });
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    if (period === "all") {
      return { from: bounds.min ?? "2000-01-01T00:00:00", to: bounds.max ?? new Date().toISOString(), label: "All imported" };
    }
    const r = finPeriodRange(period);
    return { from: `${r.from}T00:00:00`, to: `${r.to}T23:59:59`, label: r.label };
  }, [period, bounds]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await liveFobBounds();
      setBounds(b);
      const from = period === "all" ? (b.min ?? "2000-01-01T00:00:00") : `${finPeriodRange(period as FinPeriod).from}T00:00:00`;
      const to = period === "all" ? (b.max ?? new Date().toISOString()) : `${finPeriodRange(period as FinPeriod).to}T23:59:59`;
      const [s, txns, cats] = await Promise.all([fobStatsLive(from, to), listTransactions(from.slice(0, 10), to.slice(0, 10)), listCategories()]);
      setStats(s);
      const kindOf = (name: string): CategoryKind => cats.find((c) => c.name === name)?.kind ?? "expense";
      setCost24(costsBySite(txns, kindOf)["24hr"] || 0);
    } catch (e: any) {
      toast.error(e.message || "Couldn't load fob data — did the fob SQL run?");
    } finally { setLoading(false); }
  }, [period]);
  useEffect(() => { load(); }, [load]);

  const net = stats ? stats.attributedRevenue - cost24 : 0;
  const perMonth = (v: number) => (stats && stats.days ? v * (30 / stats.days) : v);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2"><DoorOpen className="h-4 w-4" /> 24hr gym unit</h3>
          <p className="text-xs text-muted-foreground">Fob usage + attributed membership revenue vs 24hr running costs.</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["all", ...FIN_PERIODS.map((p) => p.key)] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                period === p ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"}`}>
              {p === "all" ? "All imported" : FIN_PERIODS.find((x) => x.key === p)?.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !stats ? (
        <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Loading fob usage…</div>
      ) : stats.grantedEntries === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No 24hr entries in this period. {bounds.min ? `Live check-in data runs ${bounds.min.slice(0, 10)} → ${bounds.max?.slice(0, 10)}.` : "No 24hr check-ins recorded yet."}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Unique fob users" value={String(stats.uniqueUsers)} icon={Users} hint={`${stats.matchedUsers} matched to members`} />
            <Tile label="Entries" value={String(stats.grantedEntries)} icon={DoorOpen} hint={`~${Math.round(stats.grantedEntries / stats.days)}/day · ${stats.days} days`} />
            <Tile label="Code-only entries" value={`${Math.round(stats.codeOnlyShare * 100)}%`} icon={KeyRound}
                  tone={stats.codeOnlyShare > 0.25 ? "text-amber-600 dark:text-amber-400" : ""} hint="shared PIN — not attributable" />
            <Tile label="Attributed revenue /mo" value={gbp(perMonth(stats.attributedRevenue))} icon={PoundSterling} tone="text-emerald-600 dark:text-emerald-400"
                  hint={`${gbp(stats.attributedRevenue)} over ${stats.days} days`} />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs font-medium text-muted-foreground">24hr unit — monthly basis</div>
              <div className="text-sm">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{gbp(perMonth(stats.attributedRevenue))}</span> attributed revenue
                {" − "}<span className="text-red-600 dark:text-red-400 font-semibold">{gbp(cost24)}</span> 24hr costs ={" "}
                <span className={`font-bold ${perMonth(stats.attributedRevenue) - cost24 >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {gbp(perMonth(stats.attributedRevenue) - cost24)}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground max-w-[260px]">
              Revenue from matched fob users only; code-only visits and unmatched names aren't counted, so true value is higher. Tag 24hr costs under Transactions.
            </span>
          </div>

          {stats.codeOnlyShare > 0.25 && (
            <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {Math.round(stats.codeOnlyShare * 100)}% of entries use the shared code — those visits can't be tied to a member, so the unit's real value is understated. Moving everyone to personal fobs would make usage fully trackable.
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-sm font-semibold mb-2">Busiest hours</h4>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.byHour} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" interval={1} />
                <YAxis tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" width={28} />
                <Tooltip formatter={(v: any) => [v, "entries"]} labelFormatter={(h) => `${h}:00`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="entries" fill="hsl(var(--primary))" fillOpacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <h4 className="text-sm font-semibold mb-2">Users by entries</h4>
            <div className="space-y-1 max-h-[360px] overflow-auto">
              {stats.byUser.map((u) => (
                <div key={u.name} className="flex items-center gap-2 text-sm py-0.5 border-b border-border/40">
                  <span className="flex-1 truncate">{u.name}</span>
                  {u.member ? <span className="text-[10px] rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5">member {u.fee ? `· ${gbp2(u.fee)}/mo` : ""}</span>
                            : <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">no match</span>}
                  <span className="w-10 text-right tabular-nums text-muted-foreground">{u.entries}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Fob24hrPanel;
