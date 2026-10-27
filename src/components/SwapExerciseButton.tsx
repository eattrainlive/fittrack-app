import { useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Shared "Swap" exercise picker — the same alternatives dialog the strength
 * rows use, extracted so conditioning/burn blocks (AMRAP / For Time / EMOM /
 * Circuit, rendered via AmrapLogSet) can swap exercises exactly like the rest
 * of the workout.
 *
 * Self-contained: holds its own open + search state. On select it calls
 * `onSwap(newExerciseId)` and closes. The parent persists the change (e.g.
 * updateExercise(exercise.id, "name", newId)).
 */
const REASONS: [string, string][] = [
  ["alt_regress", "Easier"],
  ["alt_progress", "Harder"],
  ["alt_joint_friendly", "Joint-friendly"],
  ["alt_equipment", "Different kit"],
  ["alt_home", "At home"],
  ["alt_same_pattern", "Similar"],
];

const STRENGTH_BLOCKLIST = [
  /back squat/i,
  /front squat/i,
  /deadlift/i,
  /bench press/i,
  /overhead press/i,
  /push press/i,
  /clean|snatch|jerk/i,
  /nordic/i,
  /ghd/i,
  /pull ?up|chin ?up|muscle ?up/i,
  /pistol/i,
  /renegade/i,
  /box jump/i,
  /get ?up/i,
  /sled/i,
];

interface SwapExerciseButtonProps {
  /** The current library exercise (resolved from exercise.name → id). */
  libraryExercise: any;
  /** Full exercise library. */
  exerciseLibrary: any[];
  /** Enrichment table keyed by exercise id string (alternatives). */
  enrichment: Record<string, any>;
  /** Whether the active programme is Foundations (restricts to easier/safe). */
  isFoundations?: boolean;
  /** Called with the chosen exercise's id. */
  onSwap: (newId: any) => void;
  /** Optional smaller button styling for compact rows. */
  compact?: boolean;
}

export function SwapExerciseButton({
  libraryExercise,
  exerciseLibrary,
  enrichment,
  isFoundations = false,
  onSwap,
  compact = false,
}: SwapExerciseButtonProps) {
  const [open, setOpen] = useState(false);
  const [altSearch, setAltSearch] = useState("");

  if (!libraryExercise) return null;

  const byName: Record<string, any> = {};
  exerciseLibrary.forEach((e) => {
    byName[String(e.name).toLowerCase().trim()] = e;
  });
  const resolveAlts = (cell: string) =>
    String(cell || "")
      .split(/[,/]| or /i)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((tok) => byName[tok.toLowerCase()])
      .filter(Boolean);

  const beginnerSafe = (ex: any) =>
    String(ex.difficulty || "").toLowerCase() === "beginner" &&
    !STRENGTH_BLOCKLIST.some((rx) => rx.test(ex.name));

  const row = enrichment[String(libraryExercise.id)];
  const seen = new Set<string>([String(libraryExercise.id)]);
  let suggestions = row
    ? REASONS.flatMap(([col, label]) =>
        resolveAlts(row[col]).map((ex) => ({ ex, label })),
      ).filter(
        (s) => !seen.has(String(s.ex.id)) && seen.add(String(s.ex.id)),
      )
    : [];
  if (isFoundations) {
    suggestions = suggestions.filter(
      (s) => s.label !== "Harder" && beginnerSafe(s.ex),
    );
  }

  // Fallback heuristic if no enrichment suggestions.
  if (suggestions.length === 0) {
    const norm = (v: any) =>
      Array.isArray(v)
        ? v.map((s: any) => String(s).trim()).filter(Boolean)
        : String(v || "")
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
    const origCat = norm(libraryExercise.category);
    const origMv = norm(libraryExercise.movementType);
    const origTt = norm(libraryExercise.trackingType).join();
    const heur = exerciseLibrary
      .filter((ex) => {
        if (String(ex.id) === String(libraryExercise.id)) return false;
        if (isFoundations && !beginnerSafe(ex)) return false;
        if (
          origCat.length &&
          !norm(ex.category).some((c: string) => origCat.includes(c))
        )
          return false;
        return true;
      })
      .map((ex) => {
        let s = 0;
        if ((ex.muscle || "") === (libraryExercise.muscle || "")) s += 3;
        if (norm(ex.movementType).some((m: string) => origMv.includes(m)))
          s += 3;
        if (norm(ex.trackingType).join() === origTt) s += 2;
        if ((ex.difficulty || "") === (libraryExercise.difficulty || ""))
          s += 1;
        if ((ex.equipment || "") === (libraryExercise.equipment || "")) s += 1;
        return { ex, s };
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map((x) => ({ ex: x.ex, label: "Similar" }));
    suggestions = heur;
  }

  const pick = (id: any) => {
    onSwap(id);
    setOpen(false);
    setAltSearch("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setAltSearch("");
      }}
    >
      <DialogTrigger asChild>
        <button
          className={`inline-flex items-center gap-1 rounded-full border border-border font-bold shrink-0 ${
            compact ? "h-6 px-2 text-[11px]" : "h-8 px-2.5 text-xs"
          }`}
        >
          <RefreshCw className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} /> Swap
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] bg-card border-border max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading tracking-wider">
            Alternative Exercises
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-2">
          {suggestions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No close alternatives found.
            </p>
          )}
          {suggestions.map(({ ex: alt, label }) => (
            <div
              key={alt.id}
              className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{alt.name}</span>
                  <span className="bg-primary/15 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {label}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {alt.equipment || "Any equipment"}
                  {alt.difficulty ? ` · ${alt.difficulty}` : ""}
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => pick(alt.id)}
              >
                Select
              </Button>
            </div>
          ))}
        </div>
        <div className="pt-4 mt-2 border-t border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Or search all exercises
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={altSearch}
              onChange={(e) => setAltSearch(e.target.value)}
              placeholder="Search exercises…"
              className="pl-9"
            />
          </div>
          <div className="mt-2 max-h-[40vh] overflow-y-auto space-y-1">
            {exerciseLibrary
              .filter(
                (e) => String(e.id) !== String(libraryExercise.id),
              )
              .filter(
                (e) =>
                  !altSearch ||
                  e.name.toLowerCase().includes(altSearch.toLowerCase()),
              )
              .slice(0, 40)
              .map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-2 border border-border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{e.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {e.equipment || "Any equipment"}
                      {e.difficulty ? ` · ${e.difficulty}` : ""}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => pick(e.id)}
                  >
                    Select
                  </Button>
                </div>
              ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
