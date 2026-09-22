import { Button } from "@/components/ui/button";
import { ArrowLeft, Play } from "lucide-react";
import { WorkoutOverviewSections } from "@/components/WorkoutOverviewSections";

/**
 * The session-overview view: shows the workout title, a "Start Workout" button
 * (starts from the top), and the tappable section breakdown cards.
 *
 * Extracted from Workouts.tsx to keep that file manageable. Each section card
 * can be tapped to expand a full breakdown, carries a "Start here" button
 * (jump into the live logger at that block), and a "Skip" toggle.
 */
export function SessionOverviewView({
  quickOverviewWorkout,
  exerciseLibrary,
  skippedSectionIds,
  onStartWorkout,
  onStartHere,
  onToggleSkip,
  onBack,
}: {
  quickOverviewWorkout: any;
  exerciseLibrary: any[];
  skippedSectionIds: Set<string | number>;
  onStartWorkout: () => void;
  onStartHere: (sectionIndex: number) => void;
  onToggleSkip: (sectionId: string | number) => void;
  onBack: () => void;
}) {
  if (!quickOverviewWorkout) return null;

  return (
    <div className="w-full space-y-6 p-4 md:p-8 pt-6 pb-24">
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="w-fit -ml-4 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="flex flex-col gap-1">
          <span className="text-primary font-bold text-xs tracking-wider uppercase">
            {quickOverviewWorkout.template.stream || "Workout"}
          </span>
          <h2 className="text-4xl font-heading tracking-wider uppercase text-foreground leading-none">
            {quickOverviewWorkout.workout.name}
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mt-1">
            <span>~60 min</span>
            <span>·</span>
            <span>
              {quickOverviewWorkout.workout.exercises?.length || 0} exercises
            </span>
          </div>
        </div>
      </div>

      <Button
        className="w-full font-bold tracking-wide h-14 text-lg rounded-xl shadow-lg bg-primary text-primary-foreground"
        onClick={onStartWorkout}
      >
        <Play className="h-5 w-5 mr-2 fill-current" /> Start Workout
      </Button>

      <WorkoutOverviewSections
        exercises={quickOverviewWorkout.workout.exercises}
        exerciseLibrary={exerciseLibrary}
        onStartHere={onStartHere}
        onToggleSkip={onToggleSkip}
        skippedSectionIds={skippedSectionIds}
      />
    </div>
  );
}
