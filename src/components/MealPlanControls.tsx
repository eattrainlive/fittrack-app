import { useState } from "react";
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
import { exportMealPlanPdf } from "@/lib/mealPlanPdf";

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

  const doPdf = async (pdfScope: "day" | "week") => {
    const items = await buildPlanItems(pdfScope, selectedDate, weekStartDate);
    if (!items.length) {
      toast.error("Nothing to export yet.");
      return;
    }
    const title =
      pdfScope === "day"
        ? `Meal plan — ${new Date(selectedDate).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}`
        : `Meal plan — week of ${new Date(weekStartDate).toLocaleDateString(
            "en-GB",
            { day: "numeric", month: "short" },
          )}`;
    exportMealPlanPdf({ title, scope: pdfScope, items, targetCalories });
    setPdfOpen(false);
  };

  const mine = plans.filter((p) => p.mine);
  const shared = plans.filter((p) => !p.mine && p.visibility === "shared");

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
          <FileDown className="h-3.5 w-3.5" /> PDF
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

      {/* PDF scope choice */}
      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="w-[92vw] max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-wider">
              Save as PDF
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Export a printable plan you can save or share.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => doPdf("day")}
            >
              This day
            </Button>
            <Button className="flex-1" onClick={() => doPdf("week")}>
              This week
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
