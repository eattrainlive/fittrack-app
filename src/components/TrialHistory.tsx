import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/staffHubShared";
import {
  getTrialHistory,
  type TrialHistoryMonth,
  type TrialHistoryRow,
  type TrialOutcomeState,
} from "@/lib/trialHistory";

/**
 * Trial history — month-by-month archive of everyone who trialled, what trial
 * they did, and whether/what they converted onto. Sub-tabs = months.
 */
export function TrialHistory() {
  const [months, setMonths] = useState<TrialHistoryMonth[] | null>(null);
  const [active, setActive] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getTrialHistory();
        if (cancelled) return;
        setMonths(data);
        setActive(data[0]?.key ?? "");
      } catch (e) {
        console.error("[trialHistory] load failed", e);
        if (!cancelled) setMonths([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const month = useMemo(
    () => months?.find((m) => m.key === active) ?? null,
    [months, active],
  );

  if (loading) {
    return (
      <p className="flex items-center gap-1.5 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading trial history…
      </p>
    );
  }
  if (!months || months.length === 0) {
    return <EmptyState text="No trial history yet" />;
  }

  return (
    <div className="space-y-4">
      {/* month sub-tabs */}
      <div className="flex flex-wrap gap-1.5">
        {months.map((m) => (
          <button
            key={m.key}
            onClick={() => setActive(m.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              active === m.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {m.label} {m.total}
          </button>
        ))}
      </div>

      {month && (
        <>
          {/* summary */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="Trialled" value={String(month.total)} />
            <StatCard
              label="Converted"
              value={String(month.converted)}
              accent="emerald"
            />
            <StatCard
              label="Conversion"
              value={`${Math.round(month.rate * 100)}%`}
              sub={`${month.converted}/${month.total - month.stillOnTrial} decided`}
            />
            <StatCard
              label="Still on trial"
              value={String(month.stillOnTrial)}
            />
          </div>

          {/* per-type split */}
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-1">
              Coached 30: {month.byType.coached30.converted}/
              {month.byType.coached30.total} converted
            </span>
            <span className="rounded-full bg-muted px-2 py-1">
              Kickstart 21: {month.byType.kickstart21.converted}/
              {month.byType.kickstart21.total} converted
            </span>
          </div>

          {/* table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Trial</th>
                      <th className="px-3 py-2 font-medium">Started</th>
                      <th className="px-3 py-2 font-medium">Outcome</th>
                      <th className="px-3 py-2 font-medium">Joined onto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {month.rows.map((r) => (
                      <tr key={r.email} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.trialTypeLabel}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground tabular-nums">
                          {fmtDay(r.trialStart)}
                        </td>
                        <td className="px-3 py-2">
                          <OutcomeBadge row={r} />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.convertedProduct ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "emerald";
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p
          className={`text-xl font-bold tabular-nums ${
            accent === "emerald"
              ? "text-emerald-600 dark:text-emerald-500"
              : ""
          }`}
        >
          {value}
        </p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

const OUTCOME_META: Record<
  TrialOutcomeState,
  { label: string; cls: string }
> = {
  converted: {
    label: "Converted",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  },
  lost: {
    label: "Lost",
    cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  },
  not_converted: {
    label: "Not converted",
    cls: "bg-muted text-muted-foreground",
  },
  on_trial: {
    label: "On trial",
    cls: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
  },
};

function OutcomeBadge({ row }: { row: TrialHistoryRow }) {
  const meta = OUTCOME_META[row.state];
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}
    >
      {meta.label}
      {row.state === "lost" && row.lossReason ? ` · ${row.lossReason}` : ""}
    </span>
  );
}

function fmtDay(s: string): string {
  try {
    return new Date(s + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return s;
  }
}
