import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  listFoods,
  upsertFood,
  deleteFood,
  type FoodRow,
} from "@/lib/foodsDb";

const isStaff = () =>
  typeof window !== "undefined" &&
  localStorage.getItem("fittrack_is_staff") === "true";

const blank = {
  id: undefined as string | undefined,
  name: "",
  brand: "",
  calories: "",
  protein: "",
  carbs: "",
  fats: "",
  fibre: "",
  serving_desc: "",
  serving_g: "",
  category: "",
  verified: true,
};

export default function FoodsAdmin() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FoodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<typeof blank | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async (q = "") => {
    setLoading(true);
    setRows(await listFoods(q));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  if (!isStaff()) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Staff only.
      </div>
    );
  }

  const openNew = () => setEditing({ ...blank });
  const openEdit = (f: FoodRow) =>
    setEditing({
      id: f.id,
      name: f.name,
      brand: f.brand ?? "",
      calories: String(f.calories ?? ""),
      protein: String(f.protein ?? ""),
      carbs: String(f.carbs ?? ""),
      fats: String(f.fats ?? ""),
      fibre: f.fibre != null ? String(f.fibre) : "",
      serving_desc: f.serving_desc ?? "",
      serving_g: f.serving_g != null ? String(f.serving_g) : "",
      category: f.category ?? "",
      verified: f.verified,
    });

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const res = await upsertFood({
      id: editing.id,
      name: editing.name,
      brand: editing.brand,
      calories: Number(editing.calories) || 0,
      protein: Number(editing.protein) || 0,
      carbs: Number(editing.carbs) || 0,
      fats: Number(editing.fats) || 0,
      fibre: editing.fibre === "" ? null : (Number(editing.fibre) as any),
      serving_desc: editing.serving_desc,
      serving_g: editing.serving_g === "" ? null : (Number(editing.serving_g) as any),
      category: editing.category,
      verified: editing.verified,
    });
    setSaving(false);
    if (res.success) {
      toast.success("Saved");
      setEditing(null);
      load(search);
    } else {
      toast.error("Couldn't save — are you signed in as staff?");
      console.error(res.error);
    }
  };

  const remove = async (f: FoodRow) => {
    if (!confirm(`Delete "${f.name}"?`)) return;
    const res = await deleteFood(f.id);
    if (res.success) {
      setRows((prev) => prev.filter((r) => r.id !== f.id));
    } else {
      toast.error("Couldn't delete");
    }
  };

  const field = (
    key: keyof typeof blank,
    label: string,
    type = "text",
    placeholder = "",
  ) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={String(editing?.[key] ?? "")}
        placeholder={placeholder}
        onChange={(e) =>
          setEditing((p) => (p ? { ...p, [key]: e.target.value } : p))
        }
      />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4 pb-24">
      <button
        onClick={() => navigate("/admin")}
        className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Admin
      </button>

      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-heading uppercase">Food Database</h1>
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add food
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search foods by name or brand…"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          No foods yet. Tap "Add food" to start.
        </p>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{rows.length} foods</p>
          {rows.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2 border border-border rounded-lg p-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">
                  {f.name}
                  {f.brand ? (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {f.brand}
                    </span>
                  ) : null}
                  {!f.verified && (
                    <span className="ml-2 text-[9px] uppercase font-bold bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded-full">
                      unverified
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {f.calories} kcal · P{f.protein} C{f.carbs} F{f.fats} /100g
                  {f.serving_desc ? ` · ${f.serving_desc}` : ""}
                </p>
              </div>
              <button
                onClick={() => openEdit(f)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove(f)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="w-[92vw] max-w-md bg-card border-border max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wider">
              {editing?.id ? "Edit food" : "Add food"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {field("name", "Name *", "text", "e.g. Whey Protein")}
            {field("brand", "Brand", "text", "e.g. Per4m (blank = generic)")}
            <p className="text-[11px] text-muted-foreground -mb-1">
              Macros per 100g (or 100ml for drinks)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {field("calories", "Calories", "number")}
              {field("protein", "Protein (g)", "number")}
              {field("carbs", "Carbs (g)", "number")}
              {field("fats", "Fat (g)", "number")}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {field("fibre", "Fibre (g)", "number")}
              {field("serving_g", "Serving (g)", "number")}
            </div>
            {field("serving_desc", "Serving description", "text", "e.g. 1 scoop (30g)")}
            {field("category", "Category", "text", "optional")}
            <label className="flex items-center gap-2 text-sm font-bold pt-1">
              <input
                type="checkbox"
                checked={!!editing?.verified}
                onChange={(e) =>
                  setEditing((p) =>
                    p ? { ...p, verified: e.target.checked } : p,
                  )
                }
              />
              Verified (macros confirmed)
            </label>
            <Button
              className="w-full h-11 font-bold"
              onClick={save}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save food"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
