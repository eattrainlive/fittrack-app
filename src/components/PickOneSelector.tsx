import { sectionOptions, type PickOption } from "@/lib/pickOne";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

/**
 * Option selector for a `pickOne` section. Shows the available superset options
 * as choosable cards; the member picks one to reveal only that option's sets.
 */
export function PickOneSelector({
  sectionExercises,
  chosen,
  onChoose,
}: {
  sectionExercises: any[];
  chosen: number | null;
  onChoose: (optionIndex: number) => void;
}) {
  const options: PickOption[] = sectionOptions(sectionExercises);
  if (options.length < 2) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
          Pick one
        </span>
        <span className="text-xs text-muted-foreground">
          Choose one option to finish
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt, i) => {
          const isChosen = chosen === i;
          const labelEx = sectionExercises[opt.startIndex];
          const libName =
            labelEx?.name && !/^\d+$/.test(String(labelEx.name))
              ? labelEx.name
              : opt.label;
          return (
            <button
              key={i}
              onClick={() => onChoose(i)}
              className={`relative text-left rounded-xl border p-3 transition-all min-h-[3.25rem] ${
                isChosen
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    {opt.label}
                  </p>
                  <p className="text-sm font-bold leading-tight line-clamp-2">
                    {libName}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {opt.exerciseIds.length}{" "}
                    {opt.exerciseIds.length === 1 ? "exercise" : "exercises"}
                  </p>
                </div>
                {isChosen && (
                  <span className="shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {chosen !== null && options.length > 2 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => onChoose(-1)}
        >
          Switch option
        </Button>
      )}
    </div>
  );
}
