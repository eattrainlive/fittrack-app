import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowLeft as ArrowLeftIcon,
  Check,
  SkipForward,
} from "lucide-react";
import {
  nextVisibleBlockEx,
  prevVisibleBlockEx,
  visibleBlockPositionEx,
  visibleBlockCountEx,
} from "@/lib/workoutSkip";

/**
 * The live-logger navigation footer: Next / Finish, Previous, progress count,
 * End workout, and a "Skip section" action that advances past the current
 * block without requiring its sets to be completed.
 *
 * Extracted from Workouts.tsx to keep that file manageable. Navigation
 * respects both pickOne choices and explicitly skipped sections.
 */
export function WorkoutNavFooter({
  blocks,
  pickOneChoices,
  skippedSectionIds,
  currentBlockIndex,
  isSaving,
  onNext,
  onFinish,
  onPrev,
  onSkip,
  onEnd,
}: {
  blocks: any[];
  pickOneChoices: Record<string, number | null>;
  skippedSectionIds: Set<string | number>;
  currentBlockIndex: number;
  isSaving: boolean;
  onNext: () => void;
  onFinish: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onEnd: () => void;
}) {
  const isLast = currentBlockIndex >= blocks.length - 1;

  return (
    <div className="flex flex-col gap-3 pt-6 mt-4 border-t border-border">
      {/* Primary navigation: Next is the prominent CTA */}
      {isLast ? (
        <Button
          onClick={onFinish}
          disabled={isSaving}
          className="w-full gap-2 text-primary-foreground font-bold tracking-wide h-16 text-xl shadow-lg"
        >
          <Check className="h-5 w-5" />{" "}
          {isSaving ? "Saving..." : "Finish Workout"}
        </Button>
      ) : (
        <Button
          className="w-full gap-2 text-primary-foreground font-bold tracking-wide h-16 text-xl shadow-lg"
          onClick={onNext}
        >
          Next <ArrowRight className="h-5 w-5" />
        </Button>
      )}
      {/* Secondary navigation: Previous + Skip + progress + End */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="flex-1 font-medium tracking-wider h-12"
          disabled={currentBlockIndex === 0}
          onClick={onPrev}
        >
          <ArrowLeftIcon className="h-4 w-4" /> Previous
        </Button>
        <Button
          variant="outline"
          className="font-medium tracking-wider h-12 gap-1.5"
          onClick={onSkip}
        >
          <SkipForward className="h-4 w-4" /> Skip
        </Button>
        <span className="text-xs text-muted-foreground px-1">
          {visibleBlockPositionEx(
            blocks,
            pickOneChoices,
            skippedSectionIds,
            currentBlockIndex,
          )}{" "}
          / {visibleBlockCountEx(blocks, pickOneChoices, skippedSectionIds)}
        </span>
        <button
          onClick={onEnd}
          className="text-sm text-muted-foreground hover:text-destructive font-medium px-3 py-2 transition-colors"
        >
          End workout
        </button>
      </div>
    </div>
  );
}

/** Helper: next visible block index (exported for the parent to use). */
export function getNextVisible(
  blocks: any[],
  pickOneChoices: Record<string, number | null>,
  skippedSectionIds: Set<string | number>,
  from: number,
): number | null {
  return nextVisibleBlockEx(blocks, pickOneChoices, skippedSectionIds, from);
}

/** Helper: previous visible block index. */
export function getPrevVisible(
  blocks: any[],
  pickOneChoices: Record<string, number | null>,
  skippedSectionIds: Set<string | number>,
  from: number,
): number | null {
  return prevVisibleBlockEx(blocks, pickOneChoices, skippedSectionIds, from);
}
