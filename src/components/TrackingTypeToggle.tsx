import { Check, SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trackingOf, VALID_TRACKING } from "@/lib/tracking";

const SHORT: Record<string, string> = {
  "Weight & Reps": "W×R",
  "Reps Only": "Reps",
  "Time Only": "Time",
  "Distance & Time": "Dist",
  "Weight & Distance": "W×D",
  Calories: "Cals",
  "Calories & Time": "C+T",
};

/**
 * The per-exercise tracking toggle in the live logger.
 *
 * Tracking is a PER-EXERCISE-IN-A-PROGRAMME choice (stored on the row's
 * `trackingType`). `trackingOf()` resolves the row's current value (row →
 * library → block default). This toggle lets the coach/member pick any of the
 * valid tracking types and writes it onto the row via `onUpdate("trackingType",
 * [type])`, so it persists with the workout/programme.
 *
 * The dropdown offers ALL valid types (so a Bike Erg can be switched Time →
 * Cals → Reps etc.), with the current selection checked. A "Reset to default"
 * option clears the row's override so it falls back to the library/block
 * default.
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
  // Resolve the current tracking (row → library → block default).
  const tracking = trackingOf(exercise, exerciseLibrary);
  const currentTracking = tracking[0] ?? "";

  // The row has an explicit override only if it carries a valid trackingType.
  const ownOverride =
    exercise?.trackingType &&
    Array.isArray(exercise.trackingType) &&
    exercise.trackingType.some((t: string) => VALID_TRACKING.includes(t));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full border border-border text-xs font-bold shrink-0">
          <SlidersHorizontal className="h-3.5 w-3.5" />{" "}
          {SHORT[currentTracking] ?? currentTracking}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {VALID_TRACKING.map((tt: string) => (
          <DropdownMenuItem
            key={tt}
            onClick={() => onUpdate("trackingType", [tt])}
          >
            {tt}
            {currentTracking === tt && <Check className="h-3 w-3 ml-auto" />}
          </DropdownMenuItem>
        ))}
        {ownOverride && (
          <DropdownMenuItem onClick={() => onUpdate("trackingType", undefined)}>
            Reset to default
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
