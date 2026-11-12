// Evolt body-scan view: latest reading, trend charts, and a scan-to-scan
// comparison. Used both member-facing (EvoltScansCard) and staff-facing
// (StaffEvoltScans) via the shared EvoltScanView.
import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Loader2, Activity, ExternalLink, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyScans, getScansForEmails, listMemberEmails, type EvoltScan } from "@/lib/evoltScans";

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) : "";

const TREND: { key: keyof EvoltScan; label: string; unit: string; color: string }[] = [
  { key: "weight", label: "Weight", unit: "kg", color: "#22c55e" },
  { key: "body_fat_pct", label: "Body fat", unit: "%", color: "#f59e0b" },
  { key: "smm", label: "Muscle (SMM)", unit: "kg", color: "#3b82f6" },
  { key: "visceral_fat", label: "Visceral fat", unit: "", color: "#ef4444" },
];

// Comparison metrics + which direction is an improvement (undefined = neutral).
const COMPARE: { key: keyof EvoltScan; label: string; unit: string; lowerBetter?: boolean }[] = [
  { key: "weight", label: "Weight", unit: "kg" },
  { key: "body_fat_pct", label: "Body fat %", unit: "%", lowerBetter: true },
  { key: "body_fat", label: "Fat mass", unit: "kg", lowerBetter: true },
  { key: "smm", label: "Muscle (SMM)", unit: "kg", lowerBetter: false },
  { key: "lbm", label: "Lean mass", unit: "kg", lowerBetter: false },
  { key: "visceral_fat", label: "Visceral fat", unit: "", lowerBetter: true },
  { key: "subcutaneous_fat", label: "Subcut. fat", unit: "", lowerBetter: true },
  { key: "bmi", label: "BMI", unit: "" },
  { key: "bio_age", label: "Bio age", unit: "", lowerBetter: true },
  { key: "tbw", label: "Body water", unit: "kg" },
  { key: "protein", label: "Protein", unit: "kg", lowerBetter: false },
  { key: "whr", label: "Waist-hip", unit: "", lowerBetter: true },
];

export function EvoltScanView({ scans }: { scans: EvoltScan[] }) {
  // Comparison selection: default earliest vs latest.
  const [aId, setAId] = useState<string>("");
  const [bId, setBId] = useState<string>("");
  useEffect(() => {
    if (scans.length >= 2) {
      setAId(scans[0].id);
      setBId(scans[scans.length - 1].id);
    }
  }, [scans]);

  const a = useMemo(() => scans.find((s) => s.id === aId), [scans, aId]);
  const b = useMemo(() => scans.find((s) => s.id === bId), [scans, bId]);

  if (scans.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          No Evolt scans found for this account. If they've scanned under a different email, add it as
          a linked email and it'll match up.
        </p>
        <a
          href="https://active.evolt360.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Open the Evolt app <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  const latest = scans[scans.length - 1];
  const prev = scans.length > 1 ? scans[scans.length - 2] : null;
  const data = scans.map((s) => ({ date: fmtDate(s.scan_at), ...s }));

  const delta = (k: keyof EvoltScan) => {
    const x = latest[k] as number | null;
    const y = prev?.[k] as number | null | undefined;
    if (x == null || y == null) return null;
    return +(x - y).toFixed(1);
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        {scans.length} scan{scans.length === 1 ? "" : "s"} · latest {fmtDate(latest.scan_at)}
      </p>

      {/* Latest readings */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TREND.map((m) => {
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

      {/* Compare any two scans */}
      {scans.length >= 2 && a && b && (
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="font-semibold">Compare scans</span>
            <select
              value={aId}
              onChange={(e) => setAId(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {fmtDate(s.scan_at)}
                </option>
              ))}
            </select>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <select
              value={bId}
              onChange={(e) => setBId(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {fmtDate(s.scan_at)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {COMPARE.map((m) => {
              const av = a[m.key] as number | null;
              const bv = b[m.key] as number | null;
              if (av == null && bv == null) return null;
              const diff = av != null && bv != null ? +(bv - av).toFixed(1) : null;
              let cls = "text-muted-foreground";
              if (diff != null && diff !== 0 && m.lowerBetter !== undefined) {
                const improved = m.lowerBetter ? diff < 0 : diff > 0;
                cls = improved ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400";
              }
              return (
                <div key={m.key} className="flex items-center justify-between gap-2 text-sm border-b border-border/40 py-0.5">
                  <span className="text-muted-foreground text-xs">{m.label}</span>
                  <span className="tabular-nums">
                    {av ?? "—"} <ArrowRight className="inline h-3 w-3 text-muted-foreground" /> {bv ?? "—"} {m.unit}
                    {diff != null && diff !== 0 && (
                      <span className={`ml-1.5 text-xs font-medium ${cls}`}>
                        ({diff > 0 ? "+" : ""}
                        {diff})
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trend charts */}
      {TREND.map((m) => {
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
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} labelStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey={m.key as string} stroke={m.color} strokeWidth={2} dot={{ r: 2 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}

/** Member-facing card (own scans). */
export function EvoltScansCard() {
  const [scans, setScans] = useState<EvoltScan[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getMyScans()
      .then(setScans)
      .catch(() => setScans([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-heading text-2xl tracking-wider flex items-center gap-2">
          <Activity className="h-5 w-5" /> Evolt body scans
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your scans…
          </div>
        ) : (
          <EvoltScanView scans={scans} />
        )}
      </CardContent>
    </Card>
  );
}

/** Staff-facing: a specific member's scans (their login email + linked emails). */
export function StaffEvoltScans({ email, userId }: { email: string; userId?: string }) {
  const [scans, setScans] = useState<EvoltScan[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    (async () => {
      const emails = new Set<string>();
      if (email) emails.add(email.toLowerCase().trim());
      if (userId) {
        try {
          const linked = await listMemberEmails(userId);
          for (const m of linked) emails.add(m.email.toLowerCase().trim());
        } catch {
          /* ignore */
        }
      }
      try {
        const rows = await getScansForEmails([...emails]);
        if (live) setScans(rows);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [email, userId]);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-sm font-semibold flex items-center gap-1.5 mb-2">
        <Activity className="h-4 w-4" /> Evolt scans
      </p>
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <EvoltScanView scans={scans} />
      )}
    </div>
  );
}

export default EvoltScansCard;
