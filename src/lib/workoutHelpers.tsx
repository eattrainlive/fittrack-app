import { Minus, Plus } from "lucide-react";
import { trackingOf } from "@/lib/tracking";
import { getProgramCoverImage } from "@/lib/programCovers";

export const Stepper = ({
  value,
  onChange,
  step = 1,
  completed,
  isDecimal = false,
  className = "",
}: any) => (
  <div
    className={`flex items-center justify-between w-full h-11 rounded-md bg-background border transition-colors focus-within:ring-1 focus-within:ring-primary ${completed ? "border-transparent bg-transparent" : "border-border"} ${className}`}
  >
    <button
      type="button"
      className={`h-full w-7 shrink-0 rounded-l-md flex items-center justify-center bg-muted/30 text-muted-foreground active:bg-muted ${completed ? "opacity-0 pointer-events-none" : ""}`}
      onClick={() => onChange(Math.max(0, (value || 0) - step))}
    >
      <Minus className="h-3 w-3" />
    </button>
    <input
      type="number"
      inputMode={isDecimal ? "decimal" : "numeric"}
      className="flex-1 min-w-[2.75ch] tabular-nums text-center font-semibold text-sm sm:text-base bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
      className={`h-full w-7 shrink-0 rounded-r-md flex items-center justify-center bg-muted/30 text-muted-foreground active:bg-muted ${completed ? "opacity-0 pointer-events-none" : ""}`}
      onClick={() => onChange((value || 0) + step)}
    >
      <Plus className="h-3 w-3" />
    </button>
  </div>
);

export const TimeStepper = ({
  mins,
  secs,
  onChangeMins,
  onChangeSecs,
  completed,
  className = "",
}: any) => (
  <div
    className={`flex items-center justify-center w-full h-11 rounded-md bg-background border transition-colors focus-within:ring-1 focus-within:ring-primary ${completed ? "border-transparent bg-transparent" : "border-border"} ${className}`}
  >
    <input
      type="number"
      inputMode="numeric"
      className="w-8 min-w-[2ch] tabular-nums text-right font-semibold text-sm sm:text-base bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      value={mins === 0 || mins === undefined ? "" : mins}
      onChange={(e) => onChangeMins(parseInt(e.target.value) || 0)}
      placeholder="0"
    />
    <span className="text-muted-foreground font-bold mx-0.5">:</span>
    <input
      type="number"
      inputMode="numeric"
      className="w-8 min-w-[2ch] tabular-nums text-left font-semibold text-sm sm:text-base bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      value={
        secs === 0 || secs === undefined ? "" : secs.toString().padStart(2, "0")
      }
      onChange={(e) => onChangeSecs(parseInt(e.target.value) || 0)}
      placeholder="00"
    />
  </div>
);

export const columnsFor = (ex: any, exerciseLibrary: any[]) => {
  const t = trackingOf(ex, exerciseLibrary);
  const sets = Array.isArray(ex.setsData) ? ex.setsData : [];
  const usedReps = sets.some((s: any) => (+s.reps || 0) > 0);
  const usedTime = sets.some(
    (s: any) => (+s.timeMins || 0) > 0 || (+s.timeSecs || 0) > 0,
  );
  const usedDist = sets.some((s: any) => (+s.distance || 0) > 0);
  const usedCals = sets.some((s: any) => (+s.calories || 0) > 0);

  const canWR = t.includes("Weight & Reps");
  const canWD = t.includes("Weight & Distance");
  const canRepsOnly = t.includes("Reps Only");
  const canTime = t.includes("Time Only") || t.includes("Distance & Time");
  const canDist = t.includes("Distance & Time");
  const canCals = t.includes("Calories");

  // "Weight & Distance" (loaded carries): KG + DIST show TOGETHER — they are
  // NOT mutually exclusive. Handle as its own case before the mutual-exclusion
  // logic (which is for multi-mode toggle exercises where only one metric is
  // active at a time).
  if (canWD && !canWR) {
    return [
      { field: "weight", label: "KG", step: 2.5, decimal: true },
      { field: "distance", label: "DIST", step: 0.1, decimal: true },
    ];
  }

  // Trust entered values over trackingType: if the member/coach has time,
  // distance or calorie data, show those columns even if trackingType is
  // wrong/missing (legacy programmes). This stops a 30s hold rendering as
  // KG/REPS.
  const showTime = canTime || usedTime;
  const showDist = canDist || usedDist;
  const showCals = canCals || usedCals;
  const showWeight = canWR && !showTime && !showDist && !showCals;
  const showReps =
    (canWR || canRepsOnly) && !showTime && !showDist && !showCals;

  const cols: any[] = [];
  if (showWeight)
    cols.push({ field: "weight", label: "KG", step: 2.5, decimal: true });
  if (showReps) cols.push({ field: "reps", label: "REPS", step: 1 });
  if (showDist)
    cols.push({ field: "distance", label: "DIST", step: 0.1, decimal: true });
  if (showTime) cols.push({ field: "time", label: "TIME", isTime: true });
  if (showCals) cols.push({ field: "calories", label: "CALS", step: 1 });

  return cols.length ? cols : [{ field: "reps", label: "REPS", step: 1 }];
};

export const fmtLastTime = (s: any, tracking: string[]) => {
  if (!s) return "";
  const time =
    s.timeMins || 0 || s.timeSecs || 0
      ? `${s.timeMins ? s.timeMins + "m " : ""}${s.timeSecs ? s.timeSecs + "s" : ""}`.trim()
      : "";
  // Trust entered values over trackingType.
  if ((s.calories || 0) > 0) return `${s.calories} cals`;
  // Loaded carry: weight + distance together (e.g. "40kg × 20m").
  if ((s.weight || 0) > 0 && (s.distance || 0) > 0)
    return `${s.weight}kg × ${s.distance}m`;
  if ((s.distance || 0) > 0)
    return time ? `${s.distance}m in ${time}` : `${s.distance}m`;
  if (time) return time;
  if ((s.weight || 0) > 0) return `${s.weight}kg × ${s.reps || 0}`;
  if ((s.reps || 0) > 0) return `${s.reps} reps`;
  return "";
};

export const fmtSet = (s: any, tracking: string[]) => {
  if (!s) return "";
  const time =
    s.timeMins || 0 || s.timeSecs || 0
      ? `${s.timeMins ? s.timeMins + "m " : ""}${s.timeSecs ? s.timeSecs + "s" : ""}`.trim()
      : "";
  // Trust entered values over trackingType.
  if ((s.calories || 0) > 0) return `${s.calories} cals`;
  // Loaded carry: weight + distance together (e.g. "40kg × 20m").
  if ((s.weight || 0) > 0 && (s.distance || 0) > 0)
    return `${s.weight}kg × ${s.distance}m`;
  if ((s.distance || 0) > 0) {
    const parts = [`${s.distance}m`, time].filter(Boolean);
    return parts.join(" in ");
  }
  if (time) return time;
  if ((s.weight || 0) > 0) return `${s.weight}kg × ${s.reps || 0}`;
  if ((s.reps || 0) > 0) return `${s.reps} reps`;
  return "";
};

export const weekLabel = (program: any, week: number) => {
  const wc = program?.weekNotes?.[week]?.start_date;
  if (!wc) return `Week ${week}`;
  const d = new Date(wc + "T00:00:00");
  return `W/C ${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
};

export const sessionTitle = (program: any, workout: any) => {
  const theme =
    workout.name &&
    !workout.name.toLowerCase().startsWith("week ") &&
    !workout.name.toLowerCase().startsWith("day ")
      ? workout.name
      : `Day ${workout.day}`;
  return `${program.stream || (program.type === "GroupPT" ? "Group PT" : "Workout")} · ${weekLabel(program, workout.week)} · ${theme}`;
};

export const getCoverImage = (prog: any, cat?: string) =>
  getProgramCoverImage(prog, cat);

/**
 * Computes the live-logger block index for a given overview section index.
 *
 * The overview groups exercises by section header (one card per section), while
 * the live logger groups them into "blocks" where each block is a run of
 * non-section exercises broken by `linkedToNext` (a superset = one block). This
 * maps a section card index to the first live-logger block that belongs to that
 * section, so "Start here" can jump to the correct block even before the
 * `blocks` useMemo has recomputed (e.g. right after loading the session).
 *
 * Mirrors the grouping logic in Workouts.tsx's `blocks` memo and
 * WorkoutOverviewSections' `sections` array.
 */
export const sectionIndexToBlockIndex = (
  exercises: any[],
  sectionIndex: number,
): number => {
  const sectionStarts: number[] = [];
  let currentSection: any = null;
  let currentGroup: any[] = [];
  let blockIdx = 0;

  exercises.forEach((ex, index) => {
    if (ex.isSection) {
      // Flush any pending group from the previous section.
      if (currentGroup.length > 0) {
        blockIdx += 1;
        currentGroup = [];
      }
      currentSection = ex;
      // Record the block index this section starts at (only the first time we
      // see it — a section with no exercises yet still maps to the next block).
      if (
        sectionStarts.length === 0 ||
        sectionStarts[sectionStarts.length - 1] !== blockIdx
      ) {
        sectionStarts.push(blockIdx);
      } else {
        sectionStarts.push(blockIdx);
      }
    } else {
      currentGroup.push(ex);
      if (!ex.linkedToNext) {
        blockIdx += 1;
        currentGroup = [];
      }
    }
  });

  if (sectionIndex < 0) return 0;
  if (sectionIndex >= sectionStarts.length) return Math.max(0, blockIdx - 1);
  return sectionStarts[sectionIndex];
};
