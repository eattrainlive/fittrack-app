import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/staffHubShared";
import {
  getTrialHistory,
  type TrialHistoryMonth,
  type TrialHistoryRow,
} from "@/lib/trialHistory";

/**
 * Trial history — month-by-month archive of everyone who trialled (from the KPI
 * sheet), what trial they did, and whether/what they converted onto. Sub-tabs =
 * months.
 */
export function TrialHistory() {
  const [months, setMonths] = useState<TrialHistoryMonth[] | null>(null);
  const [active, setActive] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getTrialHistory();
        if (cancelled) return;
        setMonths(data);
        setActive(data[0]?.key ?? "");
      } catch (e) {
        console.error("[trialHistory] load failed", e);
        if (!cancelled) {
          setMonths([]);
          setError("Couldn't load the KPI sheet. Check it's link-viewable.");
        }
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
  if (error) {
    return <EmptyState text={error} />;
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatCard label="Trialled" value={String(month.total)} />
            <StatCard
              label="Converted"
              value={String(month.converted)}
              accent="emerald"
            />
            <StatCard
              label="Conversion"
              value={`${Math.round(month.rate * 100)}%`}
              sub={`${month.converted}/${month.total}`}
            />
          </div>

          {/* by category + by source */}
          <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
            {Object.entries(month.byCategory).map(([cat, v]) => (
              <span key={cat} className="rounded-full bg-muted px-2 py-1">
                {cat}: {v.converted}/{v.total}
              </span>
            ))}
            {Object.keys(month.bySource).length > 0 && (
              <span className="rounded-full bg-muted/50 px-2 py-1">
                Sources:{" "}
                {Object.entries(month.bySource)
                  .sort((a, b) => b[1] - a[1])
                  .map(([s, n]) => `${s} ${n}`)
                  .join(" · ")}
              </span>
            )}
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
                      <th className="px-3 py-2 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {month.rows.map((r) => (
                      <tr key={r.email || r.name} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.trialType}
                          {r.trialCategory && r.trialCategory !== "—"
                            ? ` · ${r.trialCategory}`
                            : ""}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">
                          {r.trialStart || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <OutcomeBadge row={r} />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.convertedOnto
                            ? `${r.convertedOnto}${
                                r.ontoCategory ? ` (${r.ontoCategory})` : ""
                              }`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.source ?? "—"}
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
            accent === "emerald" ? "text-emerald-600 dark:text-emerald-500" : ""
          }`}
        >
          {value}
        </p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function OutcomeBadge({ row }: { row: TrialHistoryRow }) {
  const converted = row.state === "converted";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
        converted
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {converted ? "Converted" : "Not converted"}
    </span>
  );
}
