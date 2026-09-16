/**
 * Ad-lib logging sheet — log an activity (swim/cycle/walk/run/sport) or a
 * custom workout (free-form exercises with sets) outside a set programme.
 *
 * Everything saves as a `workout_history` row so it flows into history,
 * streaks/consistency, PBs and the coach/trial summaries with no new plumbing.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  Dumbbell,
  Activity as ActivityIcon,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveWorkoutToHistory,
  detectAndSavePBs,
  getExercises,
} from "@/lib/store";
import { trackingOf } from "@/lib/tracking";
import { computeVolume } from "@/lib/workoutHistory";

const ACTIVITY_TYPES = [
  { key: "Swim", icon: "🏊" },
  { key: "Cycle", icon: "🚴" },
  { key: "Walk", icon: "🚶" },
  { key: "Run", icon: "🏃" },
  { key: "Sport", icon: "⚽" },
  { key: "Class", icon: "🧘" },
  { key: "Other", icon: "✨" },
];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const hasField = (tracking: string[], field: string) =>
  tracking.some((t) => t.toLowerCase().includes(field));

// ── Stepper (mirrors the Workouts page stepper, narrow-safe) ───────────────
const Stepper = ({
  value,
  onChange,
  step = 1,
  isDecimal = false,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  isDecimal?: boolean;
}) => (
  <div className="flex items-center justify-between w-full h-10 rounded-md bg-background border border-border focus-within:ring-1 focus-within:ring-primary">
    <button
      type="button"
      className="h-full w-7 shrink-0 rounded-l-md flex items-center justify-center bg-muted/30 text-muted-foreground active:bg-muted"
      onClick={() => onChange(Math.max(0, (value || 0) - step))}
    >
      <Minus className="h-3 w-3" />
    </button>
    <input
      type="number"
      inputMode={isDecimal ? "decimal" : "numeric"}
      className="flex-1 min-w-[2.75ch] tabular-nums text-center font-semibold text-sm bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      value={value === 0 || value === undefined ? "" : value}
      onChange={(e) =>
        onChange(
          isDecimal
            ? parseFloat(e.target.value) || 0
            : parseInt(e.target.value) || 0,
        )
      }
      placeholder="0"
    />
    <button
      type="button"
      className="h-full w-7 shrink-0 rounded-r-md flex items-center justify-center bg-muted/30 text-muted-foreground active:bg-muted"
      onClick={() => onChange((value || 0) + step)}
    >
      <Plus className="h-3 w-3" />
    </button>
  </div>
);

interface AdLibLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new PBs (if any) after a strength save, so the parent can show the PB modal. */
  onPBs?: (pbs: any[]) => void;
}

export function AdLibLogSheet({
  open,
  onOpenChange,
  onPBs,
}: AdLibLogSheetProps) {
  const [mode, setMode] = useState<"choose" | "activity" | "workout">("choose");
  const [exerciseLibrary, setExerciseLibrary] = useState<any[]>([]);

  // activity state
  const [actType, setActType] = useState("Run");
  const [actCustomName, setActCustomName] = useState("");
  const [actDate, setActDate] = useState(todayISO());
  const [actDuration, setActDuration] = useState("");
  const [actDistance, setActDistance] = useState("");
  const [actDistUnit, setActDistUnit] = useState("km");
  const [actCalories, setActCalories] = useState("");
  const [actNote, setActNote] = useState("");
  const [saving, setSaving] = useState(false);

  // workout state
  const [wkName, setWkName] = useState("My workout");
  const [wkDate, setWkDate] = useState(todayISO());
  const [wkExercises, setWkExercises] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open && exerciseLibrary.length === 0) {
      setExerciseLibrary(getExercises());
    }
  }, [open, exerciseLibrary.length]);

  // reset to chooser when reopened
  useEffect(() => {
    if (open) setMode("choose");
  }, [open]);

  const filteredLibrary = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return exerciseLibrary.slice(0, 30);
    return exerciseLibrary
      .filter(
        (e: any) =>
          String(e.name || "")
            .toLowerCase()
            .includes(q) ||
          String(e.id || "")
            .toLowerCase()
            .includes(q),
      )
      .slice(0, 30);
  }, [exerciseLibrary, searchQuery]);

  const resetActivity = () => {
    setActType("Run");
    setActCustomName("");
    setActDate(todayISO());
    setActDuration("");
    setActDistance("");
    setActDistUnit("km");
    setActCalories("");
    setActNote("");
  };

  const resetWorkout = () => {
    setWkName("My workout");
    setWkDate(todayISO());
    setWkExercises([]);
    setSearchQuery("");
  };

  const saveActivity = async () => {
    const duration = parseInt(actDuration) || 0;
    if (!duration) {
      toast.error("Enter a duration (minutes)");
      return;
    }
    setSaving(true);
    const name =
      actType === "Other" || actType === "Sport"
        ? actCustomName.trim() || actType
        : actType;
    const distance = actDistance ? parseFloat(actDistance) || 0 : 0;
    const calories = actCalories ? parseInt(actCalories) || 0 : 0;
    const workout = {
      type: "activity",
      activityType: actType,
      name,
      date: actDate,
      duration,
      distance,
      distanceUnit: actDistUnit,
      calories,
      note: actNote.trim(),
      exercises: [],
      volume: 0,
    };
    const res = await saveWorkoutToHistory(workout);
    setSaving(false);
    if (res.success) {
      toast.success(`${name} logged`);
      resetActivity();
      onOpenChange(false);
    } else {
      toast.error("Couldn't save — try again");
    }
  };

  const addExercise = (ex: any) => {
    const newEx = {
      id: Date.now() + Math.random(),
      blockType: "Strength",
      name: ex.id || ex.name,
      trackingType: ex.trackingType,
      setsData: [
        {
          id: "1",
          reps: 0,
          weight: 0,
          distance: 0,
          timeMins: 0,
          timeSecs: 0,
          calories: 0,
          completed: false,
        },
      ],
      rest: 0,
      linkedToNext: false,
      eachSide: false,
    };
    setWkExercises([...wkExercises, newEx]);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const addCustomExercise = () => {
    const name = searchQuery.trim();
    if (!name) return;
    const newEx = {
      id: Date.now() + Math.random(),
      blockType: "Strength",
      name,
      trackingType: "Weight & Reps",
      setsData: [
        {
          id: "1",
          reps: 0,
          weight: 0,
          distance: 0,
          timeMins: 0,
          timeSecs: 0,
          calories: 0,
          completed: false,
        },
      ],
      rest: 0,
      linkedToNext: false,
      eachSide: false,
    };
    setWkExercises([...wkExercises, newEx]);
    setSearchQuery("");
    setSearchOpen(false);
  };

  const updateSet = (
    exIdx: number,
    setIdx: number,
    field: string,
    value: number,
  ) => {
    setWkExercises((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx] };
      const sets = [...(ex.setsData || [])];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      ex.setsData = sets;
      next[exIdx] = ex;
      return next;
    });
  };

  const addSet = (exIdx: number) => {
    setWkExercises((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx] };
      ex.setsData = [
        ...(ex.setsData || []),
        {
          id: String((ex.setsData?.length || 0) + 1),
          reps: 0,
          weight: 0,
          distance: 0,
          timeMins: 0,
          timeSecs: 0,
          calories: 0,
          completed: false,
        },
      ];
      next[exIdx] = ex;
      return next;
    });
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setWkExercises((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx] };
      ex.setsData = (ex.setsData || []).filter(
        (_: any, i: number) => i !== setIdx,
      );
      next[exIdx] = ex;
      return next;
    });
  };

  const removeExercise = (exIdx: number) => {
    setWkExercises((prev) => prev.filter((_, i) => i !== exIdx));
  };

  const saveWorkout = async () => {
    const realExercises = wkExercises.filter((e) => e.name);
    if (realExercises.length === 0) {
      toast.error("Add at least one exercise");
      return;
    }
    setSaving(true);
    const volume = computeVolume({ exercises: realExercises });
    const workout = {
      type: "strength",
      name: wkName.trim() || "My workout",
      date: wkDate,
      exercises: realExercises,
      volume,
      duration: 0,
    };
    const res = await saveWorkoutToHistory(workout);
    if (res.success) {
      // run PB detection for ad-lib strength
      const pbs = await detectAndSavePBs(realExercises);
      setSaving(false);
      toast.success("Workout logged");
      if (pbs.length > 0 && onPBs) onPBs(pbs);
      resetWorkout();
      onOpenChange(false);
    } else {
      setSaving(false);
      toast.error("Couldn't save — try again");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] flex flex-col gap-0 p-0"
      >
        <SheetHeader className="px-4 pt-4 pb-2 shrink-0 border-b border-border">
          <SheetTitle className="font-heading tracking-wider text-xl uppercase">
            {mode === "choose"
              ? "Log activity or workout"
              : mode === "activity"
                ? "Log an activity"
                : "Log a workout"}
          </SheetTitle>
          {mode !== "choose" && (
            <button
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              onClick={() => setMode("choose")}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {mode === "choose" && (
            <div className="space-y-3">
              <button
                onClick={() => setMode("activity")}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors text-left"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ActivityIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-base">Log an activity</p>
                  <p className="text-xs text-muted-foreground">
                    Swim, cycle, walk, run, sport…
                  </p>
                </div>
              </button>
              <button
                onClick={() => setMode("workout")}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors text-left"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-base">Log a workout</p>
                  <p className="text-xs text-muted-foreground">
                    Build your own session with exercises & sets
                  </p>
                </div>
              </button>
            </div>
          )}

          {mode === "activity" && (
            <div className="space-y-4">
              {/* type chips */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                  Type
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {ACTIVITY_TYPES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setActType(t.key)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                        actType === t.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/20 text-muted-foreground"
                      }`}
                    >
                      <span className="text-lg">{t.icon}</span>
                      {t.key}
                    </button>
                  ))}
                </div>
              </div>

              {(actType === "Other" || actType === "Sport") && (
                <div>
                  <Label
                    htmlFor="actName"
                    className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block"
                  >
                    Name
                  </Label>
                  <Input
                    id="actName"
                    value={actCustomName}
                    onChange={(e) => setActCustomName(e.target.value)}
                    placeholder={
                      actType === "Sport"
                        ? "e.g. 5-a-side football"
                        : "e.g. Hike"
                    }
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label
                    htmlFor="actDate"
                    className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block"
                  >
                    Date
                  </Label>
                  <Input
                    id="actDate"
                    type="date"
                    value={actDate}
                    onChange={(e) => setActDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="actDur"
                    className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block"
                  >
                    Duration (min) *
                  </Label>
                  <Input
                    id="actDur"
                    type="number"
                    inputMode="numeric"
                    value={actDuration}
                    onChange={(e) => setActDuration(e.target.value)}
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label
                    htmlFor="actDist"
                    className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block"
                  >
                    Distance
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="actDist"
                      type="number"
                      inputMode="decimal"
                      value={actDistance}
                      onChange={(e) => setActDistance(e.target.value)}
                      placeholder="0"
                      className="flex-1"
                    />
                    <select
                      value={actDistUnit}
                      onChange={(e) => setActDistUnit(e.target.value)}
                      className="h-10 rounded-md border border-border bg-background px-2 text-sm"
                    >
                      <option value="km">km</option>
                      <option value="mi">mi</option>
                      <option value="m">m</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="actCal"
                    className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block"
                  >
                    Calories
                  </Label>
                  <Input
                    id="actCal"
                    type="number"
                    inputMode="numeric"
                    value={actCalories}
                    onChange={(e) => setActCalories(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="actNote"
                  className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block"
                >
                  Note (optional)
                </Label>
                <Input
                  id="actNote"
                  value={actNote}
                  onChange={(e) => setActNote(e.target.value)}
                  placeholder="e.g. Felt great"
                />
              </div>

              <Button
                className="w-full h-12 font-bold"
                onClick={saveActivity}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Save activity"
                )}
              </Button>
            </div>
          )}

          {mode === "workout" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label
                    htmlFor="wkName"
                    className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block"
                  >
                    Session name
                  </Label>
                  <Input
                    id="wkName"
                    value={wkName}
                    onChange={(e) => setWkName(e.target.value)}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="wkDate"
                    className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block"
                  >
                    Date
                  </Label>
                  <Input
                    id="wkDate"
                    type="date"
                    value={wkDate}
                    onChange={(e) => setWkDate(e.target.value)}
                  />
                </div>
              </div>

              {/* exercises */}
              {wkExercises.map((ex, exIdx) => {
                const tracking = trackingOf(ex, exerciseLibrary);
                const showWeight = hasField(tracking, "weight");
                const showReps = hasField(tracking, "reps");
                const showTime = hasField(tracking, "time");
                const showDist = hasField(tracking, "distance");
                const showCals = hasField(tracking, "calorie");
                const libEx = exerciseLibrary.find(
                  (e: any) =>
                    String(e.id) === String(ex.name) ||
                    String(e.name) === String(ex.name),
                );
                const exName = libEx?.name || ex.name;
                return (
                  <div
                    key={exIdx}
                    className="rounded-lg border border-border bg-muted/20 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm truncate flex-1">
                        {exName}
                      </p>
                      <button
                        onClick={() => removeExercise(exIdx)}
                        className="text-destructive hover:bg-destructive/10 rounded p-1 shrink-0 ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {/* header row */}
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span className="w-6 shrink-0">Set</span>
                        {showWeight && (
                          <span className="flex-1 text-center">KG</span>
                        )}
                        {showReps && (
                          <span className="flex-1 text-center">Reps</span>
                        )}
                        {showTime && (
                          <span className="flex-1 text-center">Time</span>
                        )}
                        {showDist && (
                          <span className="flex-1 text-center">Dist</span>
                        )}
                        {showCals && (
                          <span className="flex-1 text-center">Cal</span>
                        )}
                        <span className="w-6 shrink-0" />
                      </div>
                      {(ex.setsData || []).map((s: any, setIdx: number) => (
                        <div key={setIdx} className="flex items-center gap-2">
                          <span className="w-6 shrink-0 text-xs text-muted-foreground text-center">
                            {setIdx + 1}
                          </span>
                          {showWeight && (
                            <div className="flex-1 min-w-0">
                              <Stepper
                                value={s.weight || 0}
                                onChange={(v) =>
                                  updateSet(exIdx, setIdx, "weight", v)
                                }
                                step={2.5}
                                isDecimal
                              />
                            </div>
                          )}
                          {showReps && (
                            <div className="flex-1 min-w-0">
                              <Stepper
                                value={s.reps || 0}
                                onChange={(v) =>
                                  updateSet(exIdx, setIdx, "reps", v)
                                }
                              />
                            </div>
                          )}
                          {showTime && (
                            <div className="flex-1 min-w-0 flex items-center gap-1 justify-center">
                              <input
                                type="number"
                                inputMode="numeric"
                                className="w-8 min-w-[2ch] tabular-nums text-center font-semibold text-sm bg-background border border-border rounded h-10 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={s.timeMins || ""}
                                onChange={(e) =>
                                  updateSet(
                                    exIdx,
                                    setIdx,
                                    "timeMins",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                placeholder="0"
                              />
                              <span className="text-xs text-muted-foreground">
                                m
                              </span>
                              <input
                                type="number"
                                inputMode="numeric"
                                className="w-8 min-w-[2ch] tabular-nums text-center font-semibold text-sm bg-background border border-border rounded h-10 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={s.timeSecs || ""}
                                onChange={(e) =>
                                  updateSet(
                                    exIdx,
                                    setIdx,
                                    "timeSecs",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                placeholder="0"
                              />
                              <span className="text-xs text-muted-foreground">
                                s
                              </span>
                            </div>
                          )}
                          {showDist && (
                            <div className="flex-1 min-w-0">
                              <Stepper
                                value={s.distance || 0}
                                onChange={(v) =>
                                  updateSet(exIdx, setIdx, "distance", v)
                                }
                                step={1}
                                isDecimal
                              />
                            </div>
                          )}
                          {showCals && (
                            <div className="flex-1 min-w-0">
                              <Stepper
                                value={s.calories || 0}
                                onChange={(v) =>
                                  updateSet(exIdx, setIdx, "calories", v)
                                }
                              />
                            </div>
                          )}
                          <button
                            onClick={() => removeSet(exIdx, setIdx)}
                            className="w-6 shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3 mx-auto" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addSet(exIdx)}
                        className="w-full text-xs text-primary font-medium py-1 hover:bg-primary/5 rounded"
                      >
                        + Add set
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* add exercise */}
              <div className="rounded-lg border border-dashed border-border p-3">
                {!searchOpen ? (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="w-full flex items-center justify-center gap-2 text-sm font-medium text-primary py-1"
                  >
                    <Plus className="h-4 w-4" /> Add exercise
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search exercises…"
                        className="flex-1"
                      />
                      <button
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="text-muted-foreground shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredLibrary.map((ex: any) => (
                        <button
                          key={ex.id || ex.name}
                          onClick={() => addExercise(ex)}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/40 text-sm"
                        >
                          {ex.name}
                        </button>
                      ))}
                      {searchQuery.trim() && (
                        <button
                          onClick={addCustomExercise}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/40 text-sm text-primary font-medium border border-dashed border-primary/30"
                        >
                          + Add "{searchQuery.trim()}" as custom exercise
                        </button>
                      )}
                      {filteredLibrary.length === 0 && !searchQuery.trim() && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          No exercises found
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {wkExercises.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Volume:{" "}
                  {computeVolume({ exercises: wkExercises }).toLocaleString()}kg
                </p>
              )}

              <Button
                className="w-full h-12 font-bold"
                onClick={saveWorkout}
                disabled={saving || wkExercises.length === 0}
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Save workout"
                )}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
