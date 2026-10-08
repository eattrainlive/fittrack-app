import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatMetricValue,
  formatNumber,
  formatPounds,
  formatRate,
  formatSigned,
  type StaffHubResponse,
  type MonthRow,
} from "@/lib/staffHubMetrics";

const LIME = "#a3e635";
const NEAR_BLACK = "#1c1c1c";

const SHORT_MONTH: Record<string, string> = {
  January: "Jan",
  February: "Feb",
  March: "Mar",
  April: "Apr",
  May: "May",
  June: "Jun",
  July: "Jul",
  August: "Aug",
  September: "Sep",
  October: "Oct",
  November: "Nov",
  December: "Dec",
};

const NUMERIC = (v: unknown): v is number => typeof v === "number";

/** Keys that are metadata, not plottable metrics. */
const NON_METRIC = new Set(["month", "tab", "started"]);

function numericValue(row: MonthRow, key: string): number | undefined {
  const v = row[key];
  return NUMERIC(v) ? (v as number) : undefined;
}

/** Metric keys available across the month rows (exclude metadata). */
function monthMetricKeys(months: MonthRow[] | undefined): string[] {
  if (!months?.length) return [];
  const set = new Set<string>();
  for (const row of months) {
    for (const k of Object.keys(row)) {
      if (NON_METRIC.has(k)) continue;
      if (NUMERIC(row[k])) set.add(k);
    }
  }
  return [...set];
}

function headlineRow(
  year: MonthRow | null | undefined,
  labels: Record<string, string> | undefined,
) {
  if (!year) return [];
  const pick = (key: string, fallback: string) => {
    const v = numericValue(year, key);
    if (v === undefined) return null;
    return {
      key,
      label: labels?.[key] ?? fallback,
      value: v,
    };
  };
  return [
    pick("joins_total", "Sign ups"),
    pick("cancels_total", "Cancellations"),
    pick("net_members", "Net change"),
    pick("members_value", "Revenue") ?? pick("net_value", "Revenue"),
  ].filter((x): x is { key: string; label: string; value: number } => !!x);
}

function TooltipBox({
  active,
  payload,
  label,
  metricKey,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  metricKey: string;
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  const fmt = NUMERIC(val)
    ? formatMetricValue(metricKey, val as number)
    : String(val ?? "");
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
      <div className="font-medium">{label}</div>
      <div className="tabular-nums text-muted-foreground">{fmt}</div>
    </div>
  );
}

export function TrendsView({ data }: { data: StaffHubResponse | null }) {
  const months = data?.months;
  const year = data?.year;
  const labels = data?.labels;

  const keys = useMemo(() => monthMetricKeys(months), [months]);
  const defaultKey = keys.includes("joins_total") ? "joins_total" : keys[0];
  const [selected, setSelected] = useState<string>(defaultKey ?? "");

  const currentKey = keys.includes(selected) ? selected : (defaultKey ?? "");
  const currentLabel = currentKey ? (labels?.[currentKey] ?? currentKey) : "";

  const chartData = useMemo(() => {
    if (!months?.length || !currentKey) return [];
    return months
      .filter((m) => m.started !== false)
      .map((m) => ({
        month: SHORT_MONTH[m.month] ?? m.month.slice(0, 3),
        raw: m.month,
        [currentKey]: numericValue(m, currentKey) ?? 0,
      }));
  }, [months, currentKey]);

  const headlines = useMemo(() => headlineRow(year, labels), [year, labels]);

  if (!months?.length) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No monthly data yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Year so far */}
      {headlines.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Year so far
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {headlines.map((h) => (
              <Card key={h.key} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {h.label}
                  </div>
                  <div className="mt-1 text-2xl font-bold tabular-nums">
                    {formatMetricValue(h.key, h.value)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Metric picker + chart */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Monthly trend
          </h4>
          {keys.length > 0 && (
            <Select value={currentKey} onValueChange={setSelected}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Pick a metric" />
              </SelectTrigger>
              <SelectContent>
                {keys.map((k) => (
                  <SelectItem key={k} value={k}>
                    {labels?.[k] ?? k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="mb-2 text-base font-semibold">{currentLabel}</div>
            {chartData.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No data for this metric yet
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 8, bottom: 4, left: -8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border, 220 13% 91%) / 0.5)"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: NEAR_BLACK, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: NEAR_BLACK, fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted, 220 14% 96%) / 0.6)" }}
                      content={<TooltipBox metricKey={currentKey} />}
                    />
                    <Bar dataKey={currentKey} radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={LIME} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Re-export helpers so the import line in the brief compiles even if unused.
export { formatRate, formatPounds, formatNumber, formatSigned };
