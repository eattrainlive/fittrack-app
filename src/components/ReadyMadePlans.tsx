// Ready-made meal plans: the staff-shared saved plans, grouped by daily calorie
// goal so members pick one near their target and load it. Day plans band by the
// day's total; week plans by the daily average.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  FileDown,
  Loader2,
  X,
  CalendarDays,
  CalendarRange,
} from "lucide-react";
import { toast } from "sonner";
import {
  listMealPlans,
  loadMealPlan,
  type SavedMealPlan,
} from "@/lib/mealPlans";
import { buildMealPlanHtml, type RecipeDetail } from "@/lib/mealPlanPdf";
import { getRecipes, getMemberMacros } from "@/lib/store";

const todayISO = () => new Date().toISOString().slice(0, 10);
const mondayOfThisWeek = () => {
  const d = new Date(todayISO() + "T00:00:00");
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
};

const dailyMacros = (plan: SavedMealPlan) => {
  const t = plan.items.reduce(
    (a, i) => {
      const m = i.servings || 1;
      return {
        cal: a.cal + Math.round((i.calories || 0) * m),
        p: a.p + Math.round((i.protein || 0) * m),
        c: a.c + Math.round((i.carbs || 0) * m),
        f: a.f + Math.round((i.fats || 0) * m),
      };
    },
    { cal: 0, p: 0, c: 0, f: 0 },
  );
  const div = plan.scope === "week" ? 7 : 1;
  return {
    cal: Math.round(t.cal / div),
    p: Math.round(t.p / div),
    c: Math.round(t.c / div),
    f: Math.round(t.f / div),
  };
};

const bandOf = (dailyCal: number) => Math.round(dailyCal / 100) * 100;

export function ReadyMadePlans() {
  const [plans, setPlans] = useState<SavedMealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<number | null>(null);
  const [openBands, setOpenBands] = useState<Set<number>>(new Set());
  const [loadChoice, setLoadChoice] = useState<SavedMealPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const previewFrame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setTarget(getMemberMacros()?.calorie_target ?? null);
    listMealPlans()
      .then((all) => setPlans(all.filter((p) => p.visibility === "shared")))
      .finally(() => setLoading(false));
  }, []);

  // Group shared plans into calorie-goal bands.
  const bands = useMemo(() => {
    const map = new Map<number, { plan: SavedMealPlan; daily: ReturnType<typeof dailyMacros> }[]>();
    for (const p of plans) {
      const daily = dailyMacros(p);
      const b = bandOf(daily.cal);
      (map.get(b) || map.set(b, []).get(b)!).push({ plan: p, daily });
    }
    return Array.from(map.entries())
      .map(([band, items]) => ({ band, items }))
      .sort((a, b) => a.band - b.band);
  }, [plans]);

  // Open the band nearest the member's target by default.
  useEffect(() => {
    if (!bands.length || !target) return;
    let nearest = bands[0].band;
    for (const b of bands) {
      if (Math.abs(b.band - target) < Math.abs(nearest - target)) nearest = b.band;
    }
    setOpenBands(new Set([nearest]));
  }, [bands, target]);

  const toggle = (band: number) =>
    setOpenBands((prev) => {
      const next = new Set(prev);
      next.has(band) ? next.delete(band) : next.add(band);
      return next;
    });

  const viewPdf = async (plan: SavedMealPlan) => {
    const recipeDetails: Record<string, RecipeDetail> = {};
    const wantIds = new Set(
      plan.items.filter((i) => i.recipe_id).map((i) => String(i.recipe_id)),
    );
    if (wantIds.size) {
      const all = await getRecipes();
      for (const r of all as any[]) {
        if (wantIds.has(String(r.id)))
          recipeDetails[String(r.id)] = {
            ingredients: r.ingredients,
            method: r.method,
          };
      }
    }
    setPreviewHtml(
      buildMealPlanHtml({
        title: plan.name,
        scope: plan.scope,
        items: plan.items,
        targetCalories: target,
        recipeDetails,
      }),
    );
  };

  const doLoad = async (plan: SavedMealPlan, mode: "replace" | "add") => {
    setBusy(true);
    const res = await loadMealPlan(plan, mode, todayISO(), mondayOfThisWeek());
    setBusy(false);
    setLoadChoice(null);
    if (res.success) {
      toast.success(
        plan.scope === "day"
          ? `"${plan.name}" loaded into today`
          : `"${plan.name}" loaded into this week`,
      );
    } else {
      toast.error("Couldn't load — try again");
    }
  };

  const printPreview = () => {
    const win = previewFrame.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!bands.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No ready-made plans yet. Your coach will add plans here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {target && (
        <p className="text-xs text-muted-foreground">
          Your target: <strong>{target} kcal/day</strong> — the closest band is
          open below.
        </p>
      )}
      {bands.map(({ band, items }) => {
        const isOpen = openBands.has(band);
        return (
          <div
            key={band}
            className="rounded-xl border border-border overflow-hidden"
          >
            <button
              onClick={() => toggle(band)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-card"
            >
              <span className="text-sm font-bold uppercase tracking-wider">
                ~{band} kcal/day
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {items.length} plan{items.length === 1 ? "" : "s"}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </span>
            </button>
            {isOpen && (
              <div className="p-3 pt-2 space-y-2">
                {items.map(({ plan, daily }) => (
                  <div
                    key={plan.id}
                    className="border border-border rounded-lg p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{plan.name}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          {plan.scope === "week" ? (
                            <CalendarRange className="h-3 w-3" />
                          ) : (
                            <CalendarDays className="h-3 w-3" />
                          )}
                          {plan.scope === "week" ? "Full week" : "Single day"} ·{" "}
                          {daily.cal} kcal/day
                        </p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          P {daily.p}g · C {daily.c}g · F {daily.f}g
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => viewPdf(plan)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                          aria-label="View PDF"
                          title="View / save as PDF"
                        >
                          <FileDown className="h-4 w-4" />
                        </button>
                        <Button
                          size="sm"
                          onClick={() => setLoadChoice(plan)}
                        >
                          Load
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Replace / Add choice when loading a plan */}
      <Dialog open={!!loadChoice} onOpenChange={(o) => !o && setLoadChoice(null)}>
        <DialogContent className="w-[92vw] max-w-xs bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wider text-base">
              Load "{loadChoice?.name}"
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {loadChoice?.scope === "day"
              ? "Add to today's log, or replace today entirely?"
              : "Add to this week, or replace the whole week?"}
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              disabled={busy}
              onClick={() => loadChoice && doLoad(loadChoice, "add")}
            >
              Add
            </Button>
            <Button
              className="flex-1"
              disabled={busy}
              onClick={() => loadChoice && doLoad(loadChoice, "replace")}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Replace"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* In-app PDF preview overlay */}
      {previewHtml && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex flex-col">
          <div className="flex items-center justify-between gap-2 bg-[#14170f] text-white px-4 py-3">
            <button
              onClick={() => setPreviewHtml(null)}
              className="flex items-center gap-1.5 text-sm font-bold"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" /> Close
            </button>
            <button
              onClick={printPreview}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground font-bold text-sm px-4 py-2 rounded-lg"
            >
              <FileDown className="h-4 w-4" /> Save as PDF
            </button>
          </div>
          <iframe
            ref={previewFrame}
            title="Meal plan preview"
            srcDoc={previewHtml}
            className="flex-1 w-full bg-white"
          />
          <div className="bg-[#14170f] text-white/70 text-[11px] text-center py-2 px-4">
            Tap "Save as PDF" → choose Save to Files (phone) or Save as PDF (computer).
          </div>
        </div>
      )}
    </div>
  );
}
