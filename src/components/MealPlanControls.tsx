import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Save,
  FolderOpen,
  FileDown,
  Trash2,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  buildPlanItems,
  saveMealPlan,
  listMealPlans,
  deleteMealPlan,
  loadMealPlan,
  type SavedMealPlan,
} from "@/lib/mealPlans";
import { buildMealPlanHtml, type RecipeDetail } from "@/lib/mealPlanPdf";
import { X } from "lucide-react";
import { exportMealPlanImage } from "@/lib/mealPlanImage";
import { getRecipes } from "@/lib/store";

const isStaff = () =>
  typeof window !== "undefined" &&
  localStorage.getItem("fittrack_is_staff") === "true";

export function MealPlanControls({
  selectedDate,
  weekStartDate,
  targetCalories,
  onLoaded,
}: {
  selectedDate: string;
  weekStartDate: string;
  targetCalories: number | null;
  onLoaded: () => void;
}) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  // In-app PDF preview (reliable in the PWA; a new tab is unreliable on iOS).
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const previewFrame = useRef<HTMLIFrameElement>(null);

  // Save dialog state
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"day" | "week">("day");
  const [share, setShare] = useState(false);
  const [saving, setSaving] = useState(false);

  // Plans list state
  const [plans, setPlans] = useState<SavedMealPlan[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadChoice, setLoadChoice] = useState<SavedMealPlan | null>(null);

  const openSave = () => {
    setName("");
    setScope("day");
    setShare(false);
    setSaveOpen(true);
  };

  const doSave = async () => {
    setSaving(true);
    const items = await buildPlanItems(scope, selectedDate, weekStartDate);
    if (!items.length) {
      setSaving(false);
      toast.error(
        scope === "day"
          ? "This day is empty — add some foods first."
          : "This week is empty — add some foods first.",
      );
      return;
    }
    const res = await saveMealPlan({
      name,
      scope,
      visibility: share && isStaff() ? "shared" : "private",
      items,
    });
    setSaving(false);
    if (res.success) {
      toast.success("Plan saved");
      setSaveOpen(false);
    } else {
      toast.error("Couldn't save — try again");
      console.error(res.error);
    }
  };

  const openPlans = async () => {
    setPlansOpen(true);
    setLoadingList(true);
    setPlans(await listMealPlans());
    setLoadingList(false);
  };

  const doLoad = async (plan: SavedMealPlan, mode: "replace" | "add") => {
    setBusyId(plan.id);
    const res = await loadMealPlan(plan, mode, selectedDate, weekStartDate);
    setBusyId(null);
    setLoadChoice(null);
    if (res.success) {
      toast.success(`"${plan.name}" loaded`);
      setPlansOpen(false);
      onLoaded();
    } else {
      toast.error("Couldn't load the plan");
      console.error(res.error);
    }
  };

  const doDelete = async (plan: SavedMealPlan) => {
    setBusyId(plan.id);
    const res = await deleteMealPlan(plan.id);
    setBusyId(null);
    if (res.success) {
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    } else {
      toast.error("Couldn't delete");
    }
  };

  const titleFor = (s: "day" | "week") =>
    s === "day"
      ? `Meal plan — ${new Date(selectedDate).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "short",
        })}`
      : `Meal plan — week of ${new Date(weekStartDate).toLocaleDateString(
          "en-GB",
          { day: "numeric", month: "short" },
        )}`;

  const doImage = async (imgScope: "day" | "week") => {
    const items = await buildPlanItems(imgScope, selectedDate, weekStartDate);
    if (!items.length) {
      toast.error("Nothing to export yet.");
      return;
    }
    setPdfOpen(false);
    const ok = await exportMealPlanImage({
      title: titleFor(imgScope),
      scope: imgScope,
      items,
      targetCalories,
    });
    if (!ok) toast.error("Couldn't make the image — try again.");
  };

  const doPdf = async (pdfScope: "day" | "week") => {
    const items = await buildPlanItems(pdfScope, selectedDate, weekStartDate);
    if (!items.length) {
      toast.error("Nothing to export yet.");
      return;
    }
    // Pull ingredients + method for any recipe items so the PDF carries the
    // full recipes, not just names.
    const recipeDetails: Record<string, RecipeDetail> = {};
    const wantIds = new Set(
      items.filter((i) => i.recipe_id).map((i) => String(i.recipe_id)),
    );
    if (wantIds.size) {
      const all = await getRecipes();
      for (const r of all as any[]) {
        if (wantIds.has(String(r.id))) {
          recipeDetails[String(r.id)] = {
            ingredients: r.ingredients,
            method: r.method,
          };
        }
      }
    }
    const html = buildMealPlanHtml({
      title: titleFor(pdfScope),
      scope: pdfScope,
      items,
      targetCalories,
      recipeDetails,
    });
    setPdfOpen(false);
    setPreviewHtml(html); // open the in-app preview
  };

  const printPreview = () => {
    const win = previewFrame.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
    }
  };

  const mine = plans.filter((p) => p.mine);
  const shared = plans.filter((p) => !p.mine && p.visibility === "shared");

  // Rebuild the PDF preview from a SAVED plan's own data (no files stored).
  const viewPlanPdf = async (plan: SavedMealPlan) => {
    if (!plan.items.length) {
      toast.error("This plan is empty.");
      return;
    }
    const recipeDetails: Record<string, RecipeDetail> = {};
    const wantIds = new Set(
      plan.items.filter((i) => i.recipe_id).map((i) => String(i.recipe_id)),
    );
    if (wantIds.size) {
      const all = await getRecipes();
      for (const r of all as any[]) {
        if (wantIds.has(String(r.id))) {
          recipeDetails[String(r.id)] = {
            ingredients: r.ingredients,
            method: r.method,
          };
        }
      }
    }
    const html = buildMealPlanHtml({
      title: plan.name,
      scope: plan.scope,
      items: plan.items,
      targetCalories,
      recipeDetails,
    });
    setPreviewHtml(html);
  };

  const PlanRow = ({ plan }: { plan: SavedMealPlan }) => (
    <div className="flex items-center justify-between gap-2 border border-border rounded-lg p-2.5">
      <div className="min-w-0">
        <p className="text-sm font-bold truncate">{plan.name}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {plan.scope} · {plan.items.length} item
          {plan.items.length === 1 ? "" : "s"}
          {plan.visibility === "shared" ? " · shared" : ""}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant="secondary"
          disabled={busyId === plan.id}
          onClick={() => setLoadChoice(plan)}
        >
          {busyId === plan.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Load"
          )}
        </Button>
        <button
          onClick={() => viewPlanPdf(plan)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="View PDF"
          title="View / save as PDF"
        >
          <FileDown className="h-4 w-4" />
        </button>
        {plan.mine && (
          <button
            onClick={() => doDelete(plan)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label="Delete plan"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5 h-9"
          onClick={openSave}
        >
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5 h-9"
          onClick={openPlans}
        >
          <FolderOpen className="h-3.5 w-3.5" /> My Plans
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5 h-9"
          onClick={() => setPdfOpen(true)}
        >
          <FileDown className="h-3.5 w-3.5" /> Export
        </Button>
      </div>

      {/* Save dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="w-[92vw] max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wider">
              Save plan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["day", "week"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`flex-1 text-sm font-bold py-2 rounded-lg border transition-all ${
                    scope === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {s === "day" ? "This day" : "This week"}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Plan name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  scope === "day" ? "e.g. High-protein day" : "e.g. Cut week 1"
                }
              />
            </div>
            {isStaff() && (
              <button
                onClick={() => setShare((v) => !v)}
                className={`w-full flex items-center gap-2 text-sm font-bold py-2 px-3 rounded-lg border transition-all ${
                  share
                    ? "bg-primary/10 text-primary border-primary/40"
                    : "border-border text-muted-foreground"
                }`}
              >
                <Users className="h-4 w-4" />
                Share to member library
                <span className="ml-auto text-xs">{share ? "ON" : "OFF"}</span>
              </button>
            )}
            <Button
              className="w-full h-11 font-bold"
              onClick={doSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plans list dialog */}
      <Dialog open={plansOpen} onOpenChange={setPlansOpen}>
        <DialogContent className="w-[92vw] max-w-sm bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wider">
              Saved plans
            </DialogTitle>
          </DialogHeader>
          {loadingList ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : plans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No saved plans yet. Build a day or week, then tap Save.
            </p>
          ) : (
            <div className="space-y-4">
              {mine.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    My plans
                  </p>
                  {mine.map((p) => (
                    <PlanRow key={p.id} plan={p} />
                  ))}
                </div>
              )}
              {shared.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Library
                  </p>
                  {shared.map((p) => (
                    <PlanRow key={p.id} plan={p} />
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Replace / add choice when loading */}
      <Dialog
        open={!!loadChoice}
        onOpenChange={(o) => !o && setLoadChoice(null)}
      >
        <DialogContent className="w-[92vw] max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wider">
              Load "{loadChoice?.name}"
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {loadChoice?.scope === "day"
              ? "Add this to the selected day, or replace what's already there?"
              : "Add this to the current week, or replace what's already there?"}
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={!!busyId}
              onClick={() => loadChoice && doLoad(loadChoice, "add")}
            >
              Add on top
            </Button>
            <Button
              className="flex-1"
              disabled={!!busyId}
              onClick={() => loadChoice && doLoad(loadChoice, "replace")}
            >
              Replace
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export choice: image (easy to save/share) or PDF (full recipes) */}
      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="w-[92vw] max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wider">
              Export plan
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Save as image
            </p>
            <p className="text-[11px] text-muted-foreground">
              Easiest to save to your photos & share. Plan summary only.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => doImage("day")}
              >
                This day
              </Button>
              <Button className="flex-1" onClick={() => doImage("week")}>
                This week
              </Button>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-border">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Save as PDF
            </p>
            <p className="text-[11px] text-muted-foreground">
              Printable, with full recipes & ingredients.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => doPdf("day")}
              >
                This day
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => doPdf("week")}
              >
                This week
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* In-app PDF preview: full-screen overlay with Close + Save as PDF.
          Lives inside the app (not a new tab) so it's reliable in the PWA on
          iOS and can never trap the member — Close always dismisses it. */}
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
    </>
  );
}
