import { useState, useEffect } from "react";
import { Plus, Trash2, Dumbbell, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stepper, TimeStepper, columnsFor } from "@/lib/workoutHelpers";
import { resolveTrackingType } from "@/lib/tracking";

interface AmrapLogSetProps {
  /** The block's exercises (already loaded into the session). */
  exercises: any[];
  exerciseLibrary: any[];
  /** Section type — AMRAP / For Time / EMOM / Circuit. */
  sectionType: string;
  /** Called when an exercise's setsData changes (persists via the session autosave). */
  onUpdateExercise: (id: number, field: string, value: any) => void;
  /** Called with the round count so the block's score/result reflects it. */
  onRoundsChange?: (rounds: number) => void;
}

/**
 * Everfit-style round-by-round logging for tracked conditioning blocks
 * (AMRAP / For Time / EMOM / Circuit).
 *
 * Shows each exercise as a single live input row (reps prepopulated from the
 * prescription, weight from the last logged set). A prominent "Log Set" button
 * appends one completed set to EVERY exercise and bumps the round counter.
 * Logged rounds are listed and can be edited or deleted.
 *
 * The appended sets live in each exercise's `setsData` (same array normal
 * logging writes to), so they save to history with everything else and appear
 * in Past Lifts. The round count IS the AMRAP score.
 */
export function AmrapLogSet({
  exercises,
  exerciseLibrary,
  sectionType,
  onUpdateExercise,
  onRoundsChange,
}: AmrapLogSetProps) {
  // Live input values per exercise for the NEXT round to be logged.
  const [liveValues, setLiveValues] = useState<Record<number, any>>({});

  // Derive the number of rounds logged so far (equal across exercises —
  // they're appended together). Use the max in case of partial state.
  const roundsLogged = exercises.reduce((max: number, ex: any) => {
    const completed = (ex.setsData || []).filter(
      (s: any) => s.completed,
    ).length;
    return Math.max(max, completed);
  }, 0);

  useEffect(() => {
    onRoundsChange?.(roundsLogged);
  }, [roundsLogged, onRoundsChange]);

  // Initialise / refresh live values from the prescription + last logged set.
  useEffect(() => {
    setLiveValues((prev) => {
      const next: Record<number, any> = {};
      for (const ex of exercises) {
        const last = (ex.setsData || [])
          .filter((s: any) => s.completed)
          .slice(-1)[0];
        next[ex.id] = {
          reps: last?.reps ?? ex.reps ?? 0,
          weight: last?.weight ?? ex.weight ?? 0,
          distance: last?.distance ?? ex.distance ?? 0,
          timeMins: last?.timeMins ?? ex.timeMins ?? 0,
          timeSecs: last?.timeSecs ?? ex.timeSecs ?? 0,
          calories: last?.calories ?? ex.calories ?? 0,
          ...(prev[ex.id] || {}),
        };
      }
      return next;
    });
  }, [exercises]);

  const setLive = (exId: number, field: string, value: any) => {
    setLiveValues((prev) => ({
      ...prev,
      [exId]: { ...(prev[exId] || {}), [field]: value },
    }));
  };

  /** Log one set per exercise using the current live input values. */
  const handleLogSet = () => {
    for (const ex of exercises) {
      const lv = liveValues[ex.id] || {};
      const newSet = {
        id: Date.now().toString() + "_" + ex.id + "_" + Math.random(),
        reps: Number(lv.reps) || 0,
        weight: Number(lv.weight) || 0,
        distance: Number(lv.distance) || 0,
        timeMins: Number(lv.timeMins) || 0,
        timeSecs: Number(lv.timeSecs) || 0,
        calories: Number(lv.calories) || 0,
        completed: true,
      };
      const newSets = [...(ex.setsData || []), newSet];
      onUpdateExercise(ex.id, "setsData", newSets);
    }
    if (navigator.vibrate) navigator.vibrate(30);
  };

  /** Delete a logged round (removes that set index from every exercise). */
  const handleDeleteRound = (roundIdx: number) => {
    // roundIdx is 0-based among COMPLETED sets. Map to absolute index.
    for (const ex of exercises) {
      const sets = [...(ex.setsData || [])];
      const completedIndices = sets
        .map((s: any, i: number) => (s.completed ? i : -1))
        .filter((i: number) => i >= 0);
      const absIdx = completedIndices[roundIdx];
      if (absIdx != null) {
        sets.splice(absIdx, 1);
        onUpdateExercise(ex.id, "setsData", sets);
      }
    }
  };

  /** Edit a value on a logged round (updates that set on every exercise). */
  const handleEditRound = (
    roundIdx: number,
    field: string,
    value: any,
    exId: number,
  ) => {
    const ex = exercises.find((e: any) => e.id === exId);
    if (!ex) return;
    const sets = [...(ex.setsData || [])];
    const completedIndices = sets
      .map((s: any, i: number) => (s.completed ? i : -1))
      .filter((i: number) => i >= 0);
    const absIdx = completedIndices[roundIdx];
    if (absIdx != null) {
      sets[absIdx] = { ...sets[absIdx], [field]: value };
      onUpdateExercise(ex.id, "setsData", sets);
    }
  };

  // Build the list of completed rounds for display (from the first exercise).
  const firstEx = exercises[0];
  const completedSets = (firstEx?.setsData || []).filter(
    (s: any) => s.completed,
  );

  return (
    <div className="space-y-4 mt-3">
      {/* Round counter / score */}
      <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-4 py-2.5">
        <span className="text-sm font-bold text-primary">
          {sectionType === "For Time"
            ? "Rounds logged"
            : sectionType === "EMOM"
              ? "Minutes completed"
              : "Round"}
        </span>
        <span className="text-2xl font-heading tabular-nums text-primary">
          {roundsLogged}
        </span>
      </div>

      {/* Live input rows — one per exercise */}
      <div className="space-y-2.5">
        {exercises.map((ex: any) => {
          const libEx = exerciseLibrary.find(
            (e: any) => String(e.id) === String(ex.name),
          );
          const cols = columnsFor(ex, exerciseLibrary);
          const lv = liveValues[ex.id] || {};
          const name = libEx?.name || ex.label || ex.name || "Exercise";

          return (
            <div
              key={ex.id}
              className="rounded-lg border border-border bg-card p-2.5"
            >
              <div className="flex items-center gap-2 mb-2">
                {libEx?.videoUrl ? (
                  <PlayCircle className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className="font-bold text-sm leading-tight flex-1 min-w-0 truncate">
                  {name}
                </span>
                {ex.eachSide && (
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    Each Side
                  </span>
                )}
              </div>
              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${cols.length}, minmax(0,1fr))`,
                }}
              >
                {cols.map((c: any, i: number) => {
                  if (c.isTime) {
                    return (
                      <TimeStepper
                        key={i}
                        mins={lv.timeMins || 0}
                        secs={lv.timeSecs || 0}
                        onChangeMins={(v: number) =>
                          setLive(ex.id, "timeMins", v)
                        }
                        onChangeSecs={(v: number) =>
                          setLive(ex.id, "timeSecs", v)
                        }
                      />
                    );
                  }
                  return (
                    <div key={i}>
                      <span className="block text-center text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                        {c.label}
                      </span>
                      <Stepper
                        value={lv[c.field] || 0}
                        step={c.step}
                        isDecimal={c.decimal}
                        onChange={(v: number) => setLive(ex.id, c.field, v)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Log Set button */}
      <Button
        onClick={handleLogSet}
        className="w-full h-12 text-base font-bold gap-2"
        size="lg"
      >
        <Plus className="h-5 w-5" />
        Log Set · Round {roundsLogged + 1}
      </Button>

      {/* Logged rounds list */}
      {completedSets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Logged rounds
          </p>
          {completedSets.map((_: any, roundIdx: number) => (
            <div
              key={roundIdx}
              className="rounded-lg border border-border bg-muted/20 p-2.5"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold">Round {roundIdx + 1}</span>
                <button
                  onClick={() => handleDeleteRound(roundIdx)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Delete round"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1">
                {exercises.map((ex: any) => {
                  const libEx = exerciseLibrary.find(
                    (e: any) => String(e.id) === String(ex.name),
                  );
                  const name = libEx?.name || ex.label || ex.name || "Exercise";
                  const sets = (ex.setsData || []).filter(
                    (s: any) => s.completed,
                  );
                  const set = sets[roundIdx];
                  if (!set) return null;
                  const cols = columnsFor(ex, exerciseLibrary);
                  return (
                    <div
                      key={ex.id}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className="font-semibold text-muted-foreground flex-1 min-w-0 truncate">
                        {name}
                      </span>
                      <div
                        className="grid gap-1"
                        style={{
                          gridTemplateColumns: `repeat(${cols.length}, minmax(0,1fr))`,
                          minWidth: cols.length * 64,
                        }}
                      >
                        {cols.map((c: any, ci: number) => {
                          if (c.isTime) {
                            return (
                              <TimeStepper
                                key={ci}
                                mins={set.timeMins || 0}
                                secs={set.timeSecs || 0}
                                onChangeMins={(v: number) =>
                                  handleEditRound(
                                    roundIdx,
                                    "timeMins",
                                    v,
                                    ex.id,
                                  )
                                }
                                onChangeSecs={(v: number) =>
                                  handleEditRound(
                                    roundIdx,
                                    "timeSecs",
                                    v,
                                    ex.id,
                                  )
                                }
                              />
                            );
                          }
                          return (
                            <Stepper
                              key={ci}
                              value={set[c.field] || 0}
                              step={c.step}
                              isDecimal={c.decimal}
                              onChange={(v: number) =>
                                handleEditRound(roundIdx, c.field, v, ex.id)
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
