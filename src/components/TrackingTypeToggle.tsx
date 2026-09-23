import { Check, SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trackingOf } from "@/lib/tracking";

const SHORT: Record<string, string> = {
  "Weight & Reps": "W×R",
  "Reps Only": "Reps",
  "Time Only": "Time",
  "Distance & Time": "Dist",
  "Weight & Distance": "W×D",
  Calories: "Cals",
};

/**
 * The per-exercise Reps/Time (W×R) toggle in the live logger.
 *
 * Uses `trackingOf()` (library-first) for BOTH the label and the dropdown
 * options, so it stays consistent with `columnsFor` — which also uses
 * `trackingOf`. A cardio machine whose library says "Time Only" shows "Time"
 * here AND time fields in the logger, never "W×R".
 *
 * The dropdown only offers the tracking types the exercise actually supports
 * (the resolved library array), so a Rower offers Time/Dist/Cals — never
 * Weight & Reps. Only multi-type exercises (e.g. "Weight & Reps, Time Only")
 * show a Reps/Time toggle.
 */
export function TrackingTypeToggle({
  exercise,
  exerciseLibrary,
  onUpdate,
}: {
  exercise: any;
  exerciseLibrary: any[];
  onUpdate: (field: string, value: any) => void;
}) {
  // Resolve via trackingOf (library-first) — same source columnsFor uses.
  const tracking = trackingOf(exercise, exerciseLibrary);
  const currentTracking = tracking[0] ?? "";

  // Only offer the types this exercise actually supports (the resolved array).
  const availableTypes = tracking.filter(Boolean);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full border border-border text-xs font-bold shrink-0">
          <SlidersHorizontal className="h-3.5 w-3.5" />{" "}
          {SHORT[currentTracking] ?? currentTracking}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {availableTypes.map((tt: string) => (
          <DropdownMenuItem
            key={tt}
            onClick={() => onUpdate("trackingType", [tt])}
          >
            {tt}
            {currentTracking === tt && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
        ))}
        {availableTypes.length > 1 && (
          <DropdownMenuItem onClick={() => onUpdate("trackingType", undefined)}>
            Reset to default
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
