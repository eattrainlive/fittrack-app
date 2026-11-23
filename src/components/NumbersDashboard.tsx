// Staff "Numbers" tab — a gym business KPI panel (membership + revenue), modelled on the
// PT Genius dashboard. Levels (active, MRR, paused) are a live snapshot; flow metrics (new,
// left, churn, retention, net movement) are over the selected period.
import { useCallback, useEffect, useState } from "react";
import { Loader2, TrendingUp, PoundSterling, Users, UserMinus, UserPlus, AlertTriangle, Pause, Percent } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import {
  loadKpis, listPlans, savePlanPrice, periodRange,
  gbp, gbp2, pct, PERIODS, type KpiPeriod, type KpiData,
} from "@/lib/kpis";

type Tone = "good" | "warn" | "bad" | "default";
const toneClass: Record<Tone, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  bad: "text-red-600 dark:text-red-400",
  default: "text-foreground",
};

function Tile({ label, value, hint, tone = "default", icon: Icon }: {
  label: string; value: string; hint?: string; tone?: Tone; icon?: any;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${toneClass[tone]}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function NumbersDashboard({ staffSecret }: { staffSecret: string }) {
  const [period, setPeriod] = useState<KpiPeriod>("this");
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<{ plan_name: string; monthly_price: number; count: number }[]>([]);
  const [editPrices, setEditPrices] = useState<Record<string, string>>({});
  const [showPrices, setShowPrices] = useState(false);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadKpis(period, staffSecret));
    } catch (e: any) {
      toast.error(e.message || "Couldn't load numbers");
    } finally {
      setLoading(false);
    }
  }, [period, staffSecret]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    listPlans().then((p) => {
      setPlans(p);
      setEditPrices(Object.fromEntries(p.map((x) => [x.plan_name, x.monthly_price ? String(x.monthly_price) : ""])));
    }).catch(() => {});
  }, []);

  const savePlan = async (plan: string) => {
    const val = Number(editPrices[plan] || 0);
    setSavingPlan(plan);
    const res = await savePlanPrice(plan, val);
    setSavingPlan(null);
    if (!res.ok) { toast.error(res.error || "Couldn't save — did the plan-prices SQL run?"); return; }
    toast.success("Price saved");
    setPlans((prev) => prev.map((p) => (p.plan_name === plan ? { ...p, monthly_price: val } : p)));
    load();
  };

  const m = data?.metrics;
  const label = periodRange(period).label;
  const unpriced = plans.filter((p) => !p.monthly_price).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Numbers
          </h2>
          <p className="text-xs text-muted-foreground">Know your numbers — membership &amp; revenue at a glance.</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                period === p.key ? "bg-primary text-primary-foreground border-primary"
                                 : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {data && data.priceCoverage < 1 && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Revenue figures are partial — {unpriced > 0 ? `${unpriced} plan${unpriced > 1 ? "s have" : " has"} no price set` : "some active members have no plan price"}.
          <button className="ml-1 underline" onClick={() => setShowPrices(true)}>Set plan prices</button> to complete them.
        </div>
      )}

      {loading || !m ? (
        <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Crunching the numbers…
        </div>
      ) : (
        <>
          {/* Revenue + membership levels (live snapshot) */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Recurring revenue" value={gbp(m.mrr)} tone="good" icon={PoundSterling}
                  hint={`${m.active} active members`} />
            <Tile label="Average fee" value={gbp2(m.avgFee)} icon={PoundSterling} hint="per active member / month" />
            <Tile label="Active members" value={String(m.active)} icon={Users} hint="paying, not paused" />
            <Tile label="Retention" value={pct(m.retention)} icon={Percent} hint={`${label} · of members kept`}
                  tone={m.retention === null ? "default" : m.retention >= 90 ? "good" : m.retention >= 80 ? "warn" : "bad"} />
          </div>

          {/* Movement over the period */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="New members" value={String(m.wonInPeriod)} icon={UserPlus} hint={label} tone="good" />
            <Tile label="Left" value={String(m.lostInPeriod)} icon={UserMinus} hint={label}
                  tone={m.lostInPeriod > 0 ? "warn" : "default"} />
            <Tile label="Net movement" value={(m.netMovement >= 0 ? "+" : "") + m.netMovement} icon={TrendingUp}
                  hint="joined − left" tone={m.netMovement > 0 ? "good" : m.netMovement < 0 ? "bad" : "default"} />
            <Tile label="Churn" value={pct(m.churn)} icon={Percent} hint={label}
                  tone={m.churn === null ? "default" : m.churn <= 5 ? "good" : m.churn <= 10 ? "warn" : "bad"} />
          </div>

          {/* Risk + holds */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="At-risk members" value={data.atRisk === null ? "—" : String(data.atRisk)} icon={AlertTriangle}
                  tone={data.atRisk && data.atRisk > 0 ? "warn" : "default"}
                  hint={data.atRiskMrr ? `${gbp(data.atRiskMrr)} of revenue at risk` : "from attendance patterns"} />
            <Tile label="Paused" value={String(m.paused)} icon={Pause}
                  hint={m.pausedMrr ? `${gbp(m.pausedMrr)} on hold` : "frozen memberships"} />
            <Tile label="Left (all-time)" value={String(m.lost)} icon={UserMinus} hint="in the Inactive bucket" />
            <Tile label="Members at start" value={String(m.activeAtStart)} icon={Users} hint={`start of ${label.toLowerCase()}`} />
          </div>

          {/* 12-month trend (reconstructed from join/leave dates) */}
          {data.trend.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Last 12 months</h3>
                <span className="text-[11px] text-muted-foreground">Members (bars) &amp; recurring revenue (line)</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={data.trend} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis yAxisId="members" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" width={32} />
                  <YAxis yAxisId="mrr" orientation="right" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" width={48}
                         tickFormatter={(v: number) => gbp(v)} />
                  <Tooltip
                    formatter={(val: any, name: any) => (name === "mrr" ? [gbp(Number(val)), "Revenue"] : [val, "Members"])}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Area yAxisId="members" dataKey="members" fill="hsl(var(--primary))" fillOpacity={0.15} stroke="hsl(var(--primary))" strokeWidth={1.5} />
                  <Line yAxisId="mrr" dataKey="mrr" stroke="#10b981" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Reconstructed from join/leave dates on your roster — a membership trend, not verified payment history.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowPrices((s) => !s)}>
              {showPrices ? "Hide plan prices" : "Set plan prices"}
            </Button>
            <Button variant="ghost" size="sm" onClick={load}>Refresh</Button>
          </div>
        </>
      )}

      {showPrices && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Plan prices (monthly)</h3>
            <p className="text-xs text-muted-foreground">
              Enter the monthly price for each plan so revenue figures are accurate. Ordered by number of active members.
            </p>
          </div>
          <div className="space-y-1.5">
            {plans.map((p) => (
              <div key={p.plan_name} className="flex items-center gap-2">
                <span className="flex-1 truncate text-sm">
                  {p.plan_name}
                  <span className="text-muted-foreground"> · {p.count} active</span>
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm">£</span>
                  <input
                    type="number" inputMode="decimal" min={0} step="0.01"
                    value={editPrices[p.plan_name] ?? ""}
                    onChange={(e) => setEditPrices((prev) => ({ ...prev, [p.plan_name]: e.target.value }))}
                    className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm"
                    placeholder="0"
                  />
                </div>
                <Button size="sm" variant="outline" disabled={savingPlan === p.plan_name}
                        onClick={() => savePlan(p.plan_name)}>
                  {savingPlan === p.plan_name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                </Button>
              </div>
            ))}
            {plans.length === 0 && <p className="text-sm text-muted-foreground">No membership plans found on the roster yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default NumbersDashboard;
