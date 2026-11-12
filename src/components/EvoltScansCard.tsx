// Member-facing Evolt body-scan history: latest reading + trend charts.
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Loader2, Activity, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyScans, type EvoltScan } from "@/lib/evoltScans";

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) : "";

const METRICS: { key: keyof EvoltScan; label: string; unit: string; color: string }[] = [
  { key: "weight", label: "Weight", unit: "kg", color: "#22c55e" },
  { key: "body_fat_pct", label: "Body fat", unit: "%", color: "#f59e0b" },
  { key: "smm", label: "Muscle (SMM)", unit: "kg", color: "#3b82f6" },
  { key: "visceral_fat", label: "Visceral fat", unit: "", color: "#ef4444" },
];

export function EvoltScansCard() {
  const [scans, setScans] = useState<EvoltScan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyScans()
      .then(setScans)
      .catch(() => setScans([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your scans…
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-heading text-2xl tracking-wider flex items-center gap-2">
            <Activity className="h-5 w-5" /> Evolt body scans
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No scans found for your account yet. If you've had an Evolt scan with us under a
            different email, let a coach know and we'll link it up.
          </p>
          <a
            href="https://active.evolt360.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Open the Evolt app <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </CardContent>
      </Card>
    );
  }

  const latest = scans[scans.length - 1];
  const prev = scans.length > 1 ? scans[scans.length - 2] : null;
  const data = scans.map((s) => ({ date: fmtDate(s.scan_at), ...s }));

  const delta = (k: keyof EvoltScan) => {
    const a = latest[k] as number | null;
    const b = prev?.[k] as number | null | undefined;
    if (a == null || b == null) return null;
    const d = +(a - b).toFixed(1);
    return d;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-heading text-2xl tracking-wider flex items-center gap-2">
          <Activity className="h-5 w-5" /> Evolt body scans
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {scans.length} scan{scans.length === 1 ? "" : "s"} · latest {fmtDate(latest.scan_at)}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Latest readings */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {METRICS.map((m) => {
            const v = latest[m.key] as number | null;
            const d = delta(m.key);
            const good = m.key === "smm" ? (d ?? 0) >= 0 : (d ?? 0) <= 0;
            return (
              <div key={m.key} className="rounded-lg border border-border bg-muted/30 p-2.5">
                <p className="text-[11px] text-muted-foreground">{m.label}</p>
                <p className="text-lg font-bold">
                  {v ?? "—"}
                  <span className="text-xs font-normal text-muted-foreground"> {m.unit}</span>
                </p>
                {d != null && d !== 0 && (
                  <p className={`text-[11px] ${good ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {d > 0 ? "+" : ""}
                    {d} since last
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Trend charts */}
        {METRICS.map((m) => {
          const hasData = data.some((d) => d[m.key] != null);
          if (!hasData) return null;
          return (
            <div key={m.key}>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {m.label} {m.unit && `(${m.unit})`}
              </p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    labelStyle={{ fontSize: 11 }}
                  />
                  <Line
                    type="monotone"
                    dataKey={m.key as string}
                    stroke={m.color}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        })}

        <a
          href="https://active.evolt360.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Full report in the Evolt app <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </CardContent>
    </Card>
  );
}

export default EvoltScansCard;
