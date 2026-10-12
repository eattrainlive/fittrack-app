import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getParqStatusAll, type ParqAllRow } from "@/lib/parq";

type Filter = "all" | "flagged" | "expired";

const fmt = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export function StaffParqList() {
  const [rows, setRows] = useState<ParqAllRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getParqStatusAll();
      setRows(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (filter === "flagged" && !r.any_yes) return false;
    if (filter === "expired" && r.valid) return false;
    if (q) {
      const hay = `${r.name || ""} ${r.email || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const flaggedCount = rows.filter((r) => r.any_yes).length;
  const expiredCount = rows.filter((r) => !r.valid).length;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading PAR-Q status…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Couldn't load PAR-Q status — the staff-only view isn't available to this
        account.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg tracking-wide">PAR-Q Status</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {rows.length} members
        </Badge>
        <Badge
          variant="secondary"
          className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
        >
          {flaggedCount} flagged
        </Badge>
        <Badge
          variant="secondary"
          className="text-xs bg-destructive/10 text-destructive border-destructive/30"
        >
          {expiredCount} expired/missing
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="flagged">Flagged (any yes)</SelectItem>
            <SelectItem value="expired">Expired / missing</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="h-9 max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={load}>
          Refresh
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">
          No members match this filter.
        </p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-3 py-2">Name</th>
                <th className="text-left font-medium px-3 py-2">Email</th>
                <th className="text-left font-medium px-3 py-2">Completed</th>
                <th className="text-left font-medium px-3 py-2">Expires</th>
                <th className="text-left font-medium px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.member_id}
                  className="border-t border-border align-top"
                >
                  <td className="px-3 py-2 font-medium">{r.name || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.email || "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {fmt(r.completed_at)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {r.expires_at ? fmt(r.expires_at) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {r.valid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-3 w-3" /> Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3 w-3" />{" "}
                          {r.completed_at ? "Expired" : "Missing"}
                        </span>
                      )}
                      {r.any_yes && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                        >
                          <ShieldAlert className="h-2.5 w-2.5 mr-0.5" /> Flagged
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
