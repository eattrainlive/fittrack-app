/**
 * Tracking-type selector for the programme editor exercise row.
 *
 * Lets the coach change an exercise's `trackingType` (the per-exercise-in-a-programme
 * choice) right in the builder — e.g. switch a Bike Erg from Time Only → Calories,
 * or set Weight & Distance for a loaded carry. Writes the chosen type(s) onto the
 * row via `onChange`, which re-renders the input columns automatically.
 *
 * Uses a Popover with checkboxes so multiple types can be selected where it makes
 * sense (e.g. "Weight & Reps, Time Only" for a machine that supports both).
 */
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { VALID_TRACKING } from "@/lib/tracking";

interface TrackingTypeSelectorProps {
  /** Current tracking type(s) on the exercise row (string[] or comma-joined). */
  value: any;
  onChange: (types: string[]) => void;
}

const SHORT_LABEL: Record<string, string> = {
  "Weight & Reps": "W×R",
  "Reps Only": "Reps",
  "Time Only": "Time",
  "Distance & Time": "Dist+T",
  "Weight & Distance": "W×D",
  Calories: "Cals",
  "Calories & Time": "Cals+T",
};

const toArr = (v: any): string[] => {
  if (Array.isArray(v) && v.length > 0)
    return v.map((s) => String(s).trim()).filter(Boolean);
  if (typeof v === "string" && v.trim())
    return v
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
};

export const TrackingTypeSelector = ({
  value,
  onChange,
}: TrackingTypeSelectorProps) => {
  const current = toArr(value);
  const valid = current.filter((t) => VALID_TRACKING.includes(t));

  const displayLabel =
    valid.length > 0
      ? valid.map((t) => SHORT_LABEL[t] || t).join(", ")
      : "Tracking";

  const toggle = (type: string) => {
    const set = new Set(valid);
    if (set.has(type)) set.delete(type);
    else set.add(type);
    // Preserve order of VALID_TRACKING for a stable display.
    const next = VALID_TRACKING.filter((t) => set.has(t));
    onChange(next.length ? next : ["Weight & Reps"]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-1.5 text-xs whitespace-nowrap shrink-0"
          title="Tracking type"
        >
          <span className="font-bold uppercase tracking-wide">
            {displayLabel}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-[10px] uppercase font-bold text-muted-foreground px-1 pb-1.5">
          Tracking type
        </p>
        <div className="space-y-0.5">
          {VALID_TRACKING.map((t) => {
            const checked = valid.includes(t);
            return (
              <div
                key={t}
                className="flex items-center gap-2 rounded-sm px-1.5 py-1 hover:bg-muted/50 cursor-pointer"
                onClick={() => toggle(t)}
              >
                <Checkbox checked={checked} className="pointer-events-none" />
                <Label className="text-xs cursor-pointer flex-1">{t}</Label>
                {checked && (
                  <Check className="h-3 w-3 text-primary opacity-50" />
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
