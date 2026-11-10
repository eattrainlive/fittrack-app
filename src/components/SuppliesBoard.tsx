// Staff Hub — supplies / low-stock board. Flag what's running low or out.
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { EmptyState, staffName } from "@/components/staffHubShared";
import {
  listSupplies,
  createSupply,
  setSupplyStatus,
  deleteSupply,
  STOCK_LABEL,
  type Supply,
  type StockStatus,
} from "@/lib/staffBoards";

const STATUSES: StockStatus[] = ["ok", "low", "out"];
const pill: Record<StockStatus, string> = {
  ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  low: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  out: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export function SuppliesBoard() {
  const [items, setItems] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listSupplies());
    } catch {
      toast.error("Couldn't load supplies");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!name.trim()) return;
    const r = await createSupply({ name, category, by: staffName() || "Staff" });
    if (r.ok) {
      setName("");
      setCategory("");
      load();
    } else toast.error(r.error || "Couldn't add");
  };

  const low = items.filter((s) => s.status !== "ok");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Package className="h-5 w-5" /> Supplies
        </h2>
        <p className="text-sm text-muted-foreground">{low.length} item{low.length === 1 ? "" : "s"} low or out</p>
      </div>

      <div className="flex gap-2">
        <Input placeholder="Item e.g. Blue roll" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Input placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} className="max-w-[160px]" />
        <Button className="gap-1 shrink-0" onClick={add}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <EmptyState text="No items tracked yet. Add the things you reorder." />
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">{s.name}</p>
                {s.category && <p className="text-[11px] text-muted-foreground">{s.category}</p>}
              </div>
              <div className="flex gap-1">
                {STATUSES.map((st) => (
                  <button
                    key={st}
                    onClick={() => setSupplyStatus(s.id, st, staffName() || "Staff").then(load)}
                    className={`rounded-full px-2 py-1 text-[11px] font-medium transition ${
                      s.status === st ? pill[st] : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {STOCK_LABEL[st]}
                  </button>
                ))}
              </div>
              <button className="text-muted-foreground shrink-0" onClick={() => deleteSupply(s.id).then(load)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SuppliesBoard;
