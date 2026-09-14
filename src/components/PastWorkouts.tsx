import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Save, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trackingOf } from "@/lib/tracking";
import { formatConditioningResult } from "@/components/ConditioningTimer";
import { getWorkoutHistory, getExercises } from "@/lib/store";
import {
  updateWorkout,
  deleteWorkout,
  computeVolume,
} from "@/lib/workoutHistory";

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const hasField = (tracking: string[], field: string) =>
  tracking.some((t) => t.toLowerCase().includes(field));

export function PastWorkouts() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [exercises] = useState<any[]>(getExercises());
  const [editing, setEditing] = useState<any | null>(null);
  const [draft, setDraft] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => setWorkouts(getWorkoutHistory());

  useEffect(() => {
    load();
  }, []);

  const openEdit = (w: any) => {
    setEditing(w);
    setDraft(JSON.parse(JSON.stringify(w)));
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    const res = await updateWorkout(draft);
    setSaving(false);
    if (res.success) {
      toast.success("Workout updated");
      setEditing(null);
      setDraft(null);
      load();
    } else {
      toast.error("Couldn't save — try again");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await deleteWorkout(deleteId);
    setDeleting(false);
    if (res.success) {
      toast.success("Workout deleted");
      setDeleteId(null);
      load();
    } else {
      toast.error("Couldn't delete — try again");
    }
  };

  const updateSet = (
    exIdx: number,
    setIdx: number,
    field: string,
    value: string,
  ) => {
    if (!draft) return;
    const exs = [...draft.exercises];
    const ex = { ...exs[exIdx] };
    const sets = [...(ex.setsData || [])];
    sets[setIdx] = {
      ...sets[setIdx],
      [field]: value === "" ? 0 : Number(value),
    };
    ex.setsData = sets;
    exs[exIdx] = ex;
    setDraft({ ...draft, exercises: exs });
  };

  if (workouts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No sessions logged yet. Complete a workout to see it here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {workouts.map((w: any) => {
          const exCount = (w.exercises || []).filter(
            (e: any) => !e.isSection,
          ).length;
          return (
            <div
              key={w.id}
              className="flex items-center justify-between rounded-md border border-border/50 bg-muted/20 group"
            >
              <button
                onClick={() => openEdit(w)}
                className="flex-1 flex items-center justify-between text-left px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium truncate">
                    {w.name || w.program || "Workout"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {w.date ? fmtDate(w.date) : "—"}
                    {exCount ? ` · ${exCount} exercises` : ""}
                    {w.volume ? ` · ${w.volume.toLocaleString()}kg` : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 mr-1 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteId(w.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {draft?.name || draft?.program || "Workout"}
            </DialogTitle>
            <DialogDescription>
              {draft && fmtDate(draft.date)} — edit set values, then save
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              {(draft.exercises || []).map((ex: any, exIdx: number) => {
                if (ex.isSection) {
                  const resultText = ex.result
                    ? formatConditioningResult(ex.result)
                    : null;
                  return (
                    <div
                      key={exIdx}
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground pt-2 flex items-center gap-2"
                    >
                      <span>{ex.name}</span>
                      {resultText && (
                        <span className="text-primary normal-case font-bold tracking-normal bg-primary/10 px-2 py-0.5 rounded-full text-xs">
                          {resultText}
                        </span>
                      )}
                    </div>
                  );
                }
                const tracking = trackingOf(ex, exercises);
                const showWeight = hasField(tracking, "weight");
                const showReps = hasField(tracking, "reps");
                const showTime = hasField(tracking, "time");
                const showDist = hasField(tracking, "distance");
                const showCals = hasField(tracking, "calorie");
                const sets = ex.setsData || [];
                const libEx = exercises.find(
                  (e) =>
                    String(e.id) === String(ex.name) ||
                    String(e.name) === String(ex.name),
                );
                return (
                  <div
                    key={exIdx}
                    className="rounded-lg border border-border bg-muted/20 p-3"
                  >
                    <p className="font-medium text-sm mb-2">
                      {libEx?.name || ex.name}
                    </p>
                    {sets.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No sets logged.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {sets.map((s: any, setIdx: number) => (
                          <div
                            key={setIdx}
                            className="flex items-center gap-2 text-xs flex-wrap"
                          >
                            <span className="text-muted-foreground w-8">
                              S{setIdx + 1}
                            </span>
                            {showWeight && (
                              <label className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={s.weight || ""}
                                  onChange={(e) =>
                                    updateSet(
                                      exIdx,
                                      setIdx,
                                      "weight",
                                      e.target.value,
                                    )
                                  }
                                  className="w-16 h-8 bg-background"
                                  step="0.5"
                                />
                                kg
                              </label>
                            )}
                            {showReps && (
                              <label className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={s.reps || ""}
                                  onChange={(e) =>
                                    updateSet(
                                      exIdx,
                                      setIdx,
                                      "reps",
                                      e.target.value,
                                    )
                                  }
                                  className="w-14 h-8 bg-background"
                                />
                                reps
                              </label>
                            )}
                            {showTime && (
                              <label className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={s.timeMins || ""}
                                  onChange={(e) =>
                                    updateSet(
                                      exIdx,
                                      setIdx,
                                      "timeMins",
                                      e.target.value,
                                    )
                                  }
                                  className="w-12 h-8 bg-background"
                                />
                                :
                                <Input
                                  type="number"
                                  value={s.timeSecs || ""}
                                  onChange={(e) =>
                                    updateSet(
                                      exIdx,
                                      setIdx,
                                      "timeSecs",
                                      e.target.value,
                                    )
                                  }
                                  className="w-12 h-8 bg-background"
                                />
                              </label>
                            )}
                            {showDist && (
                              <label className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={s.distance || ""}
                                  onChange={(e) =>
                                    updateSet(
                                      exIdx,
                                      setIdx,
                                      "distance",
                                      e.target.value,
                                    )
                                  }
                                  className="w-16 h-8 bg-background"
                                  step="0.01"
                                />
                                m
                              </label>
                            )}
                            {showCals && (
                              <label className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={s.calories || ""}
                                  onChange={(e) =>
                                    updateSet(
                                      exIdx,
                                      setIdx,
                                      "calories",
                                      e.target.value,
                                    )
                                  }
                                  className="w-16 h-8 bg-background"
                                />
                                cal
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">
                  Volume: {computeVolume(draft).toLocaleString()}kg
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(null);
                      setDraft(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="gap-2"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workout?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the session from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
