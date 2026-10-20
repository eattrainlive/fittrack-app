import { useCallback, useEffect, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  getTrialStats,
  type TrialStats,
  type TrialTypeStat,
} from "@/lib/trialStats";
import { getTrialOutcomes, LOSS_REASONS } from "@/lib/trialOutcomes";

/**
 * TrialsDashboard — conversion stats + funnel for the consolidated Trials hub.
 *
 * Data comes from `getTrialStats(periodDays)` in src/lib/trialStats.ts.
 * Return shape (documented in the brief):
 *   {
 *     periodDays,
 *     activeNow, activeByType: { coached30, kickstart21 },
 *     overall: { rate, converted, completed },
 *     byType: { coached30: {...}, kickstart21: {...} },
 *     prevRate, // 0..1
 *     funnel: { started, attended1st, attended3plus, reviewBooked, converted },
 *     avgDaysToFirstSession,
 *   }
 */

// TrialStats is re-exported from the lib — the local interface is now a type alias.

const EMPTY: TrialStats = {
  periodDays: 30,
  activeNow: 0,
  activeByType: { coached30: 0, kickstart21: 0 },
  overall: { rate: 0, converted: 0, completed: 0 },
  byType: {
    coached30: { rate: 0, converted: 0, completed: 0 },
    kickstart21: { rate: 0, converted: 0, completed: 0 },
  },
  prevRate: 0,
  funnel: {
    started: 0,
    attended1st: 0,
    attended3plus: 0,
    reviewBooked: 0,
    converted: 0,
  },
  avgDaysToFirstSession: null,
};

const PERIODS = [
  { days: 30, label: "30d" },
  { days: 60, label: "60d" },
  { days: 90, label: "90d" },
];

function pct(rate?: number): string {
  if (rate == null || Number.isNaN(rate)) return "0%";
  return `${Math.round(rate * 100)}%`;
}

export function TrialsDashboard() {
  const [period, setPeriod] = useState(30);
  const [stats, setStats] = useState<TrialStats | null>(null);
  const [lossByReason, setLossByReason] = useState<Record<string, number>>({});
  const [lostTotal, setLostTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const res: TrialStats = await getTrialStats(days);
      setStats(res ?? EMPTY);
      // Loss reasons (period-aware via created_at) for the "why we lost" card.
      const outcomes = await getTrialOutcomes();
      const cutoff = Date.now() - days * 86400000;
      const counts: Record<string, number> = {};
      let total = 0;
      outcomes.forEach((o) => {
        if (o.outcome !== "lost") return;
        if (o.created_at && new Date(o.created_at).getTime() < cutoff) return;
        const key = o.reason ?? "other";
        counts[key] = (counts[key] ?? 0) + 1;
        total++;
      });
      setLossByReason(counts);
      setLostTotal(total);
    } catch (e) {
      console.error("[trialsDashboard] getTrialStats failed", e);
      setStats(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period);
  }, [period, load]);

  const overall = stats?.overall ?? EMPTY.overall;
  const prevRate = stats?.prevRate ?? EMPTY.prevRate;
  const activeByType = stats?.activeByType ?? EMPTY.activeByType;
  const funnel = stats?.funnel ?? EMPTY.funnel;
  const byType = stats?.byType ?? EMPTY.byType;
  const avgDays = stats?.avgDaysToFirstSession ?? EMPTY.avgDaysToFirstSession;

  return (
    <div className="space-y-4">
      {/* period toggle */}
      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            onClick={() => setPeriod(p.days)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              period === p.days
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading trial stats…
        </div>
      ) : !stats || !stats.overall ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No trial data yet for this period.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* headline metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* conversion rate */}
            <Card>
              <CardContent className="p-4 space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Conversion rate ({period}d)
                </p>
                <div className="flex items-end justify-between gap-2">
                  <p className="text-2xl font-bold tabular-nums">
                    {pct(overall.rate)}
                  </p>
                  {prevRate != null && (
                    <DeltaChip current={overall.rate ?? 0} prev={prevRate} />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {overall.converted ?? 0} of {overall.completed ?? 0} decided
                </p>
              </CardContent>
            </Card>

            {/* on trial now */}
            <Card>
              <CardContent className="p-4 space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground">
                  On trial now
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {stats?.activeNow ?? 0}
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                  {activeByType.coached30 != null && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5">
                      Coached 30: {activeByType.coached30}
                    </span>
                  )}
                  {activeByType.kickstart21 != null && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5">
                      Kickstart 21: {activeByType.kickstart21}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* avg days to first session */}
            <Card>
              <CardContent className="p-4 space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Avg days to first session
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {avgDays != null ? `${avgDays.toFixed(1)}d` : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  from trial start to first visit
                </p>
              </CardContent>
            </Card>
          </div>

          {/* conversion by trial type */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                By trial type
              </p>
              <div className="space-y-2">
                {Object.entries(byType).map(([key, v]) => {
                  const vt = v as TrialTypeStat;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="capitalize text-muted-foreground">
                        {key}
                      </span>
                      <span className="tabular-nums">
                        {pct(vt.rate)}{" "}
                        <span className="text-muted-foreground">
                          ({vt.converted ?? 0}/{vt.completed ?? 0})
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* funnel */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Funnel — last {period} days
              </p>
              <FunnelBar
                label="Started trial"
                value={funnel.started}
                max={funnel.started ?? 0}
              />
              <FunnelBar
                label="Attended 1st session"
                value={funnel.attended1st}
                max={funnel.started ?? 0}
              />
              <FunnelBar
                label="3+ visits in week 1"
                value={funnel.attended3plus}
                max={funnel.started ?? 0}
              />
              <FunnelBar
                label="Review booked"
                value={funnel.reviewBooked}
                max={funnel.started ?? 0}
              />
              <FunnelBar
                label="Converted"
                value={funnel.converted}
                max={funnel.started ?? 0}
                accent
              />
            </CardContent>
          </Card>

          {/* why we lost */}
          {lostTotal > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Why we lost — last {period} days ({lostTotal})
                </p>
                {LOSS_REASONS.map((r) => {
                  const c = lossByReason[r.key] ?? 0;
                  if (c === 0) return null;
                  return (
                    <FunnelBar
                      key={r.key}
                      label={r.label}
                      value={c}
                      max={lostTotal}
                    />
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function DeltaChip({ current, prev }: { current: number; prev: number }) {
  const diff = current - prev;
  if (Math.abs(diff) < 0.0005) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground">
        <Minus className="h-3 w-3" /> vs {pct(prev)}
      </span>
    );
  }
  const up = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
        up
          ? "text-emerald-600 dark:text-emerald-500"
          : "text-red-600 dark:text-red-500"
      }`}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}{" "}
      vs {pct(prev)}
    </span>
  );
}

function FunnelBar({
  label,
  value,
  max,
  accent,
}: {
  label: string;
  value?: number;
  max: number;
  accent?: boolean;
}) {
  const v = value ?? 0;
  const pctWidth = max > 0 ? Math.min(100, Math.round((v / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">
          {v}
          {max > 0 && (
            <span className="text-muted-foreground"> · {pctWidth}%</span>
          )}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            accent ? "bg-primary" : "bg-primary/60"
          }`}
          style={{ width: `${pctWidth}%` }}
        />
      </div>
    </div>
  );
}
