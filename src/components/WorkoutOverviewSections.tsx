import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell } from "lucide-react";

/**
 * Renders the section/exercise overview cards for the workout browse/preview
 * view. Extracted from Workouts.tsx to keep that file manageable.
 */
export function WorkoutOverviewSections({
  exercises,
  exerciseLibrary,
}: {
  exercises: any[];
  exerciseLibrary: any[];
}) {
  const sections: any[] = [];
  let currentSection: any = null;
  let currentGroup: any[] = [];

  exercises?.forEach((ex: any) => {
    if (ex.isSection) {
      if (currentSection || currentGroup.length > 0) {
        sections.push({ section: currentSection, exercises: currentGroup });
      }
      currentSection = ex;
      currentGroup = [];
    } else {
      currentGroup.push(ex);
    }
  });
  if (currentSection || currentGroup.length > 0) {
    sections.push({ section: currentSection, exercises: currentGroup });
  }

  return (
    <div className="space-y-4 mt-6">
      {sections.map((sec, idx) => (
        <Card key={idx} className="bg-card border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-muted/50 p-3 border-b border-border flex justify-between items-center">
              <span className="font-bold text-sm tracking-wider uppercase">
                {sec.section ? sec.section.name : `Block ${idx + 1}`}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {sec.exercises.length} exercises
              </span>
            </div>
            <div className="p-3 space-y-3">
              {sec.exercises.map((ex: any, exIdx: number) => {
                const libEx = exerciseLibrary.find(
                  (e) => String(e.id) === String(ex.name),
                );

                const setsCount = ex.setsData?.length || ex.sets || 3;
                const firstSet = ex.setsData?.[0] || ex || {};

                const rawTrack =
                  ex.trackingType ?? libEx?.trackingType ?? "Weight & Reps";
                const trackingArray = (
                  Array.isArray(rawTrack)
                    ? rawTrack
                    : String(rawTrack).split(/[;,]/)
                )
                  .map((s) => s.trim())
                  .filter(Boolean);

                const dist = firstSet.distance || ex.distance || 0;
                const mins = firstSet.timeMins || ex.timeMins || 0;
                const secs = firstSet.timeSecs || ex.timeSecs || 0;
                const cals =
                  firstSet.calories ||
                  ex.calories ||
                  (trackingArray.includes("Calories")
                    ? firstSet.reps || ex.reps || 0
                    : 0);
                const reps = firstSet.reps || ex.reps || 0;

                let details: string[] = [];
                if (
                  trackingArray.includes("Weight & Distance") &&
                  (firstSet.weight || ex.weight || 0) > 0
                )
                  details.push(`${firstSet.weight || ex.weight}kg`);
                if (trackingArray.includes("Weight & Distance") && dist)
                  details.push(`${dist}m`);
                if (trackingArray.includes("Distance & Time") && dist)
                  details.push(`${dist}m`);
                if (
                  (trackingArray.includes("Time Only") ||
                    trackingArray.includes("Distance & Time")) &&
                  (mins || secs)
                )
                  details.push(
                    `${mins ? mins + "m " : ""}${secs ? secs + "s" : ""}`.trim(),
                  );
                if (trackingArray.includes("Calories") && cals)
                  details.push(`${cals} cals`);
                if (trackingArray.includes("Weight & Reps") && reps)
                  details.push(`${reps} reps`);
                if (trackingArray.includes("Reps Only") && reps)
                  details.push(`${reps} reps`);
                if (details.length === 0 && reps) details.push(`${reps} reps`);
                const detailStr = details.join(", ");

                return (
                  <div
                    key={exIdx}
                    className="flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center shrink-0">
                        <Dumbbell className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm leading-tight">
                          {libEx ? libEx.name : ex.name || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {setsCount} sets {detailStr ? `× ${detailStr}` : ""}
                        </span>
                      </div>
                    </div>
                    {ex.linkedToNext && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-sm">
                        Superset
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
