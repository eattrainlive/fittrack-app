import { useMemo, useState } from "react";
import { Search, Download, ArrowUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface DetailColumn {
  key: string;
  label: string;
  numeric?: boolean;
}

export interface DetailRow {
  [key: string]: string | number;
}

function exportTableCsv(
  title: string,
  columns: DetailColumn[],
  rows: DetailRow[],
) {
  const head = columns.map((c) => `"${c.label}"`).join(",");
  const body = rows
    .map((r) =>
      columns
        .map((c) => `"${String(r[c.key] ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  const csv = `${head}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `usage-${title.replace(/\s+/g, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function UsageDetailDialog({
  open,
  onOpenChange,
  title,
  columns,
  rows,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  columns: DetailColumn[];
  rows: DetailRow[];
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = out.filter((r) =>
        columns.some((c) =>
          String(r[c.key] ?? "")
            .toLowerCase()
            .includes(q),
        ),
      );
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      out = [...out].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        let cmp = 0;
        if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
        else cmp = String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, query, sortKey, sortDir, columns]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 shrink-0 pb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="pl-8"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportTableCsv(title, columns, filtered)}
          >
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`px-2 py-2 text-left font-medium ${c.numeric ? "text-right" : ""}`}
                  >
                    <button
                      onClick={() => toggleSort(c.key)}
                      className="inline-flex items-center gap-1 hover:text-primary"
                    >
                      {c.label}
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-2 py-6 text-center text-muted-foreground"
                  >
                    No results
                  </td>
                </tr>
              )}
              {filtered.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-2 py-1.5 ${c.numeric ? "text-right tabular-nums" : ""}`}
                    >
                      {String(r[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="shrink-0 pt-2 text-xs text-muted-foreground text-right">
          {filtered.length} {filtered.length === 1 ? "row" : "rows"}
        </div>
      </DialogContent>
    </Dialog>
  );
}
