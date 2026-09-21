/**
 * Self-contained "Swap" button + smart alternates panel.
 *
 * Designed so it can be dropped into the Admin programme editor without adding
 * state to the already-massive Admin component. The button opens the
 * SmartAlternatesPanel; on "apply" it calls `onSwap(exerciseId, newId)` so the
 * parent can persist the change (and propagate across rounds if needed).
 *
 * `allExercises` + `weekWorkouts` + `sessionIndex` feed the ranking context
 * (equipment available, exercises used this session / week).
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft } from "lucide-react";
import { SmartAlternatesPanel } from "@/components/SmartAlternatesPanel";
import type { AlternateContext } from "@/lib/smartAlternates";

interface SmartSwapButtonProps {
  exerciseId: string;
  exerciseName: string;
  allExercises: any[];
  weekWorkouts: any[];
  sessionIndex: number;
  onSwap: (newId: string, newName: string) => void;
}

function buildCtx(
  allExercises: any[],
  weekWorkouts: any[],
  sessionIndex: number,
): AlternateContext {
  const session = weekWorkouts[sessionIndex];
  const sessionExercises = (session?.exercises || [])
    .filter((e: any) => !e.isSection)
    .map((e: any) => String(e.name || e.id));
  const currentWeek = Number(session?.week || 0);
  const patternsThisWeek = (weekWorkouts || [])
    .filter((w: any) => Number(w.week) === currentWeek)
    .flatMap((w: any) =>
      (w.exercises || [])
        .filter((e: any) => !e.isSection)
        .map((e: any) => {
          const libEx = allExercises.find(
            (x: any) => String(x.id) === String(e.name),
          );
          return Array.isArray(libEx?.movementType)
            ? libEx.movementType[0]
            : libEx?.movementType || "";
        }),
    )
    .filter(Boolean);
  const equipment = Array.from(
    new Set(
      allExercises
        .map((e) => e.equipment)
        .filter(Boolean)
        .map((e: string) => e.toLowerCase()),
    ),
  );
  return {
    equipment,
    patternsUsedThisWeek: patternsThisWeek as string[],
    sessionExercises,
  };
}

export const SmartSwapButton = ({
  exerciseId,
  exerciseName,
  allExercises,
  weekWorkouts,
  sessionIndex,
  onSwap,
}: SmartSwapButtonProps) => {
  const [open, setOpen] = useState(false);

  const context = buildCtx(allExercises, weekWorkouts, sessionIndex);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0"
        onClick={() => setOpen(true)}
        title="Swap (smart alternates)"
      >
        <ArrowRightLeft className="h-4 w-4" />
      </Button>
      <SmartAlternatesPanel
        open={open}
        onOpenChange={setOpen}
        exerciseId={exerciseId}
        exerciseName={exerciseName}
        allExercises={allExercises}
        context={context}
        onApply={(alt) => {
          onSwap(alt.id, alt.name);
        }}
      />
    </>
  );
};
