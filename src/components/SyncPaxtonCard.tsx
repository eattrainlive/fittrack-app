import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface PaxtonResult {
  total: number;
  imported: number;
  matched: number;
  unmatched: string[];
}

export default function SyncPaxtonCard({
  staffSecret,
  onDone,
}: {
  staffSecret: string;
  onDone?: () => void;
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<PaxtonResult | null>(null);

  const handleSync = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSyncing(true);
    setResult(null);
    try {
      const text = await file.text();
      const rows = parseNet2Csv(text);

      if (!rows.length) {
        throw new Error(
          "No valid 24hr-gym entries found (need 'Access permitted' rows with a user and '(In)' direction).",
        );
      }

      const { data, error } = await supabase.functions.invoke("import-paxton", {
        body: {
          staffSecret,
          site: "unit_1b",
          rows: rows.map((r) => ({ user: r.user, ts: r.iso })),
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setResult(data as PaxtonResult);
      toast.success(
        `Imported ${data.imported} entries · matched ${data.matched} members`,
      );
      onDone?.();
    } catch (err: any) {
      toast.error(`Paxton sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
      e.target.value = "";
    }
  };

  return (
    <Card className="flex-1 bg-card border-border">
      <CardHeader>
        <CardTitle>Sync Paxton (24hr gym)</CardTitle>
        <CardDescription>
          Upload a Net2 (Lite) <strong>door events</strong> export (.csv) to
          import 24hr-gym entries as gym visits. Only real{" "}
          <em>Access permitted</em> entries are kept; door-opened/exit rows are
          ignored. Members are matched by name.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept=".csv"
            onChange={handleSync}
            disabled={isSyncing}
          />
          {isSyncing && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
        </div>
        {result && (
          <div className="text-sm space-y-1 rounded-lg border border-border bg-muted/30 p-3">
            <p className="font-semibold">Import complete</p>
            <p className="text-muted-foreground">
              Total rows: {result.total} · Imported: {result.imported} · Matched
              members: {result.matched} · Unmatched: {result.unmatched.length}
            </p>
            {result.unmatched.length > 0 && (
              <div className="pt-1">
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  Unmatched names (name spelling differs from their app/roster —
                  visit still logged):
                </p>
                <div className="flex flex-wrap gap-1">
                  {result.unmatched.slice(0, 20).map((name) => (
                    <span
                      key={name}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border/50"
                    >
                      {name}
                    </span>
                  ))}
                  {result.unmatched.length > 20 && (
                    <span className="text-[11px] text-muted-foreground">
                      +{result.unmatched.length - 20} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Net2 CSV parser ────────────────────────────────────────────────────────
// Columns: Date/time, User, Where, Event, Details
// Keep only rows where Event contains "Access permitted", User is non-empty,
// and Where contains "(In)".

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  return lines
    .filter((l) => l.trim())
    .map((line) => {
      const out: string[] = [];
      let cur = "";
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQ = !inQ;
          }
          continue;
        }
        if (ch === "," && !inQ) {
          out.push(cur);
          cur = "";
          continue;
        }
        cur += ch;
      }
      out.push(cur);
      return out.map((s) => s.trim());
    });
}

function parseNet2Csv(text: string): { user: string; iso: string }[] {
  const rows = parseCsv(text);
  if (!rows.length) return [];

  // Find the header row (contains "Date/time" or "User")
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = (rows[i] || []).map((c) => String(c || "").toLowerCase());
    if (
      r.some(
        (c) => c.includes("date/time") || c === "user" || c.includes("where"),
      )
    ) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    // No header — assume row 0
    headerIdx = 0;
  }

  const headers = (rows[headerIdx] || []).map((h) =>
    String(h || "")
      .toLowerCase()
      .trim(),
  );

  const findCol = (...names: string[]): number => {
    for (const n of names) {
      const i = headers.findIndex((h) => h === n || h.includes(n));
      if (i !== -1) return i;
    }
    return -1;
  };

  const dtIdx = findCol("date/time", "datetime", "date");
  const userIdx = findCol("user", "name");
  const whereIdx = findCol("where", "door", "location");
  const eventIdx = findCol("event");

  if (dtIdx === -1 || userIdx === -1) return [];

  const out: { user: string; iso: string }[] = [];

  for (const row of rows.slice(headerIdx + 1)) {
    const dt = String(row[dtIdx] || "").trim();
    const user = String(row[userIdx] || "").trim();
    const where = String(row[whereIdx] || "").trim();
    const event = String(row[eventIdx] || "").trim();

    if (!user) continue;
    if (!/access permitted/i.test(event)) continue;
    if (where && !/\(in\)/i.test(where)) continue;

    // "13/09/2026 19:25:02" -> ISO
    const iso = net2ToIso(dt);
    if (!iso) continue;

    out.push({ user, iso });
  }

  return out;
}

function net2ToIso(raw: string): string | null {
  const s = raw.trim();
  // dd/mm/yyyy hh:mm:ss
  const m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  let yyyy = Number(m[3]);
  if (yyyy < 100) yyyy += 2000;
  const hh = Number(m[4]);
  const mi = Number(m[5]);
  const ss = m[6] ? Number(m[6]) : 0;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const d = new Date(yyyy, mm - 1, dd, hh, mi, ss);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}
