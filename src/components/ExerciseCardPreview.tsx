/**
 * Read-only preview of a workout session rendered exactly as the member sees
 * it in the live logger. Reuses the SAME `columnsFor` / `resolveTrackingType`
 * logic so the preview can never drift from the real logging screen.
 *
 * Used by the programme editor's "Preview client view" button so a coach can
 * see how a session looks without saving + navigating to Workouts.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link2, X } from "lucide-react";
import { columnsFor, Stepper, TimeStepper, fmtSet } from "@/lib/workoutHelpers";
import { resolveTrackingType } from "@/lib/tracking";

interface PreviewExercise {
  id: any;
  isSection?: boolean;
  name?: string;
  label?: string;
  blockType?: string;
  sectionType?: string;
  description?: string;
  sets?: number;
  reps?: any;
  rest?: number;
  eachSide?: boolean;
  linkedToNext?: boolean;
  trackingType?: string[];
  notes?: string;
  coachingNotes?: string;
  timeMins?: number;
  timeSecs?: number;
  distance?: number;
  calories?: number;
  weight?: number;
  timeCapMins?: number;
  targetNote?: string;
}

interface ExerciseCardPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionName: string;
  exercises: PreviewExercise[];
  exerciseLibrary: any[];
}

/** Build the setsData the member logger would seed from a programme exercise. */
const buildPreviewSets = (ex: PreviewExercise) => {
  const setCount = ex.sets && ex.sets > 0 ? ex.sets : 3;
  return Array.from({ length: setCount }).map((_, i) => ({
    id: `preview-${ex.id}-${i}`,
    reps: ex.reps !== undefined && ex.reps !== "" ? ex.reps : 0,
    weight: ex.weight || 0,
    distance: ex.distance || 0,
    timeMins: ex.timeMins || 0,
    timeSecs: ex.timeSecs || 0,
    calories: ex.calories || 0,
    completed: false,
  }));
};

const SectionHeader = ({ ex }: { ex: PreviewExercise }) => (
  <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 mb-3">
    <p className="font-heading font-bold text-sm uppercase tracking-wider text-primary">
      {ex.sectionType && ex.sectionType !== "Normal"
        ? `${ex.sectionType} · `
        : ""}
      {ex.name || "Section"}
    </p>
    {ex.description && (
      <p className="text-xs text-muted-foreground mt-1">{ex.description}</p>
    )}
    {ex.timeCapMins != null && ex.timeCapMins > 0 && (
      <p className="text-xs text-primary/80 mt-0.5">
        Time cap: {ex.timeCapMins} min
      </p>
    )}
  </div>
);

const ExerciseRow = ({
  ex,
  exerciseLibrary,
  isSuperset,
}: {
  ex: PreviewExercise;
  exerciseLibrary: any[];
  isSuperset: boolean;
}) => {
  const libEx = exerciseLibrary.find((le) => String(le.id) === String(ex.name));
  const displayName = libEx?.name || ex.label || ex.name || "Exercise";
  const tracking = resolveTrackingType(ex, exerciseLibrary);
  const setsData = buildPreviewSets(ex);
  const cols = columnsFor({ ...ex, setsData }, exerciseLibrary);

  return (
    <div
      className={`rounded-md border bg-card p-3 ${
        isSuperset
          ? "border-primary/50 border-b-0 rounded-b-none"
          : "border-border"
      }`}
    >
      {isSuperset && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1 z-20 shadow-sm">
          <Link2 className="h-3 w-3" /> Superset
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-foreground leading-tight">
            {displayName}
            {ex.eachSide && (
              <span className="ml-1.5 text-[10px] text-muted-foreground uppercase">
                Each Side
              </span>
            )}
          </p>
          {(ex.notes || ex.coachingNotes) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {ex.notes || ex.coachingNotes}
            </p>
          )}
        </div>
        {ex.rest != null && ex.rest > 0 && (
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
            {ex.rest}s rest
          </span>
        )}
      </div>

      {/* Set rows — mirrors the live logger grid */}
      <div className="space-y-1.5">
        <div
          className="grid gap-x-1 items-center text-[10px] uppercase text-muted-foreground"
          style={{
            gridTemplateColumns: `24px repeat(${cols.length}, minmax(0,1fr)) 32px`,
          }}
        >
          <span className="text-center">#</span>
          {cols.map((c: any, i: number) => (
            <span key={i} className="text-center">
              {c.label}
            </span>
          ))}
          <span />
        </div>
        {setsData.map((s: any, i: number) => (
          <div
            key={i}
            className="grid gap-x-1 items-center"
            style={{
              gridTemplateColumns: `24px repeat(${cols.length}, minmax(0,1fr)) 32px`,
            }}
          >
            <span className="text-center text-xs text-muted-foreground font-semibold">
              {i + 1}
            </span>
            {cols.map((c: any, ci: number) => {
              if (c.isTime) {
                return (
                  <div key={ci} className="pointer-events-none">
                    <TimeStepper
                      mins={s.timeMins}
                      secs={s.timeSecs}
                      onChangeMins={() => {}}
                      onChangeSecs={() => {}}
                      completed={false}
                    />
                  </div>
                );
              }
              return (
                <div key={ci} className="pointer-events-none">
                  <Stepper
                    value={s[c.field]}
                    onChange={() => {}}
                    step={c.step || 1}
                    isDecimal={c.decimal}
                    completed={false}
                  />
                </div>
              );
            })}
            <span className="text-center text-[10px] text-muted-foreground">
              {fmtSet(s, tracking)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ExerciseCardPreview = ({
  open,
  onOpenChange,
  sessionName,
  exercises,
  exerciseLibrary,
}: ExerciseCardPreviewProps) => {
  // Group exercises by section, preserving order.
  const groups: {
    section: PreviewExercise | null;
    items: PreviewExercise[];
  }[] = [];
  let current: {
    section: PreviewExercise | null;
    items: PreviewExercise[];
  } | null = null;
  for (const ex of exercises) {
    if (ex.isSection) {
      current = { section: ex, items: [] };
      groups.push(current);
    } else {
      if (!current) {
        current = { section: null, items: [] };
        groups.push(current);
      }
      current.items.push(ex);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-lg font-heading tracking-wide truncate">
                {sessionName || "Session Preview"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Client view — read-only preview of this session
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground text-sm">
                No exercises in this session yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((g, gi) => (
                <div key={gi}>
                  {g.section && <SectionHeader ex={g.section} />}
                  <div className="space-y-2">
                    {g.items.map((ex, i) => {
                      const isSupersetStart = !!ex.linkedToNext;
                      const isSupersetCont =
                        i > 0 && !!g.items[i - 1].linkedToNext;
                      return (
                        <div
                          key={ex.id?.toString() || i}
                          className={`relative ${
                            isSupersetCont
                              ? "border-primary/50 border-t-0 rounded-t-none"
                              : ""
                          }`}
                        >
                          <ExerciseRow
                            ex={ex}
                            exerciseLibrary={exerciseLibrary}
                            isSuperset={isSupersetStart}
                          />
                        </div>
                      );
                    })}
                    {g.items.length === 0 && g.section && (
                      <p className="text-xs text-muted-foreground italic px-1 py-2">
                        No exercises in this section.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border shrink-0 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
