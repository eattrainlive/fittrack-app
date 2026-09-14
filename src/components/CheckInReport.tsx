import { useEffect, useState } from "react";
import { Download, Loader2, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface ScanRow {
  ts: string;
  member_name: string | null;
  member_ref: string | null;
  result: string;
  method: string | null;
  site: string | null;
  device_id: string | null;
  checkin_for: string | null;
  source: string | null;
  gym_members?: { product: string | null } | null;
}

const STAFF_SECRET = import.meta.env.VITE_STAFF_SECRET || "";

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const resultColor: Record<string, string> = {
  granted: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  no_membership: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  denied_lapsed: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  unknown_code: "bg-destructive/15 text-destructive",
};

const resultLabel: Record<string, string> = {
  granted: "Granted",
  no_membership: "No membership",
  denied_lapsed: "Denied",
  unknown_code: "Unknown",
};

function buildCsv(rows: ScanRow[]): string {
  const headers = [
    "Date/Time",
    "Name",
    "Membership",
    "Result",
    "Checked in for",
    "Source",
    "Method",
    "Site",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const dt = new Date(r.ts).toLocaleString("en-GB");
    const name = (r.member_name || "Unknown").replace(/,/g, ";");
    const membership = (r.gym_members?.product || "—").replace(/,/g, ";");
    const result = resultLabel[r.result] || r.result;
    const checkinFor = (r.checkin_for || "").replace(/,/g, ";");
    const source = (r.source || "").replace(/,/g, ";");
    const method = r.method || "";
    const site = r.site || "";
    lines.push(
      [dt, name, membership, result, checkinFor, source, method, site]
        .map((c) => `"${c}"`)
        .join(","),
    );
  }
  return lines.join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function CheckInReport() {
  const today = new Date();
  const [startDate, setStartDate] = useState(toISODate(addDays(today, -7)));
  const [endDate, setEndDate] = useState(toISODate(today));
  const [filterResult, setFilterResult] = useState<string>("all");
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const startISO = `${startDate}T00:00:00`;
      const endISO = `${endDate}T23:59:59`;
      const { data, error } = await supabase
        .from("scan_events")
        .select(
          "ts, member_name, member_ref, result, method, site, device_id, checkin_for, source, gym_members(product)",
        )
        .gte("ts", startISO)
        .lte("ts", endISO)
        .order("ts", { ascending: false });
      if (error) throw error;
      setRows((data || []) as unknown as ScanRow[]);
    } catch (e) {
      console.error("check-in report load failed", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const filtered =
    filterResult === "all"
      ? rows
      : rows.filter((r) => r.result === filterResult);

  // Summary
  const total = filtered.length;
  const uniquePeople = new Set(
    filtered.map((r) => r.member_name || r.member_ref),
  ).size;
  const byResult: Record<string, number> = {};
  filtered.forEach((r) => {
    byResult[r.result] = (byResult[r.result] || 0) + 1;
  });

  // Booked session vs open gym vs 24hr gym split (by checkin_for)
  const OPEN_GYM = "open gym";
  const GYM_24HR = "24 hour gym";
  const split = { booked: 0, openGym: 0, gym24hr: 0 };
  filtered.forEach((r) => {
    const cf = String(r.checkin_for || "").toLowerCase();
    if (!cf) return;
    if (cf === OPEN_GYM) split.openGym++;
    else if (cf === GYM_24HR || cf === "24hr gym") split.gym24hr++;
    else split.booked++;
  });

  const handleExport = () => {
    const csv = buildCsv(filtered);
    downloadCsv(csv, `checkins_${startDate}_${endDate}.csv`);
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg uppercase tracking-wide flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Check-in Report
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} check-ins · {uniquePeople} unique people
            </p>
          </div>
          <Button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="gap-2"
            size="sm"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Result
            </label>
            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All results</option>
              <option value="granted">Granted</option>
              <option value="no_membership">No membership</option>
              <option value="denied_lapsed">Denied</option>
              <option value="unknown_code">Unknown</option>
            </select>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(byResult).map(([k, v]) => (
            <Badge key={k} variant="secondary" className={resultColor[k] || ""}>
              {resultLabel[k] || k}: {v}
            </Badge>
          ))}
        </div>

        {/* Booked / Open gym / 24hr split */}
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="gap-1">
            Booked sessions: {split.booked}
          </Badge>
          <Badge variant="outline" className="gap-1">
            Open gym: {split.openGym}
          </Badge>
          <Badge variant="outline" className="gap-1">
            24hr gym: {split.gym24hr}
          </Badge>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No check-ins in this range.
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground">
                    <th className="text-left font-medium px-3 py-2">
                      Date/Time
                    </th>
                    <th className="text-left font-medium px-3 py-2">Name</th>
                    <th className="text-left font-medium px-3 py-2">
                      Membership
                    </th>
                    <th className="text-left font-medium px-3 py-2">Result</th>
                    <th className="text-left font-medium px-3 py-2 hidden md:table-cell">
                      Checked in for
                    </th>
                    <th className="text-left font-medium px-3 py-2 hidden md:table-cell">
                      Source
                    </th>
                    <th className="text-left font-medium px-3 py-2 hidden sm:table-cell">
                      Method
                    </th>
                    <th className="text-left font-medium px-3 py-2 hidden sm:table-cell">
                      Site
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {new Date(r.ts).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {r.member_name || "Unknown"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.gym_members?.product || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            resultColor[r.result] ||
                            "bg-muted text-muted-foreground"
                          }`}
                        >
                          {resultLabel[r.result] || r.result}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                        {r.checkin_for || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden md:table-cell capitalize">
                        {r.source || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell capitalize">
                        {r.method || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                        {r.site || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
