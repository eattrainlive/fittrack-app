import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, ChevronDown, Play, EyeOff, Eye, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveTrackingType } from "@/lib/tracking";

/**
 * Renders the section/exercise overview cards for the workout browse/preview
 * view. Each section header is tappable to expand a full breakdown, carries a
 * "Start here" button (jump into the live logger at that block), and a "Skip"
 * toggle (pre-skip a section before starting).
 */
export function WorkoutOverviewSections({
  exercises,
  exerciseLibrary,
  onStartHere,
  onToggleSkip,
  skippedSectionIds,
}: {
  exercises: any[];
  exerciseLibrary: any[];
  onStartHere?: (sectionIndex: number) => void;
  onToggleSkip?: (sectionId: string | number) => void;
  skippedSectionIds?: Set<string | number>;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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

  const toggleExpand = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="space-y-4 mt-6">
      {sections.map((sec, idx) => {
        const sectionId = sec.section?.id;
        const isSkipped =
          sectionId != null && skippedSectionIds?.has(sectionId);
        const isExpanded = expanded.has(idx);
        const sectionType = sec.section?.sectionType || "Normal";
        const isConditioning = [
          "AMRAP",
          "EMOM",
          "For Time",
          "Circuit",
        ].includes(sectionType);

        return (
          <Card
            key={idx}
            className={cn(
              "bg-card border-border overflow-hidden transition-opacity",
              isSkipped && "opacity-50",
            )}
          >
            <CardContent className="p-0">
              {/* Tappable header */}
              <button
                onClick={() => toggleExpand(idx)}
                className="w-full bg-muted/50 p-3 border-b border-border flex justify-between items-center text-left active:scale-[0.99] transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                      isExpanded && "rotate-180",
                    )}
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-sm tracking-wider uppercase block truncate">
                      {sec.section ? sec.section.name : `Block ${idx + 1}`}
                    </span>
                    {isConditioning && sec.section?.description && (
                      <span className="text-[11px] text-primary font-medium flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {sec.section.description}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isSkipped && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      Skipped
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground font-medium">
                    {sec.exercises.length} exercises
                  </span>
                </div>
              </button>

              {/* Expanded breakdown */}
              {isExpanded && (
                <div className="p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* Section aim / description */}
                  {sec.section?.description && !isConditioning && (
                    <p className="text-sm text-muted-foreground italic leading-relaxed bg-muted/30 rounded-lg p-2.5">
                      {sec.section.description}
                    </p>
                  )}
                  {isConditioning && (
                    <p className="text-sm text-muted-foreground italic leading-relaxed bg-muted/30 rounded-lg p-2.5">
                      {sectionType} block
                      {sec.section.description
                        ? ` · ${sec.section.description}`
                        : ""}
                    </p>
                  )}

                  {/* Exercise list */}
                  {sec.exercises.map((ex: any, exIdx: number) => {
                    const libEx = exerciseLibrary.find(
                      (e) => String(e.id) === String(ex.name),
                    );

                    const setsCount = ex.setsData?.length || ex.sets || 3;
                    const firstSet = ex.setsData?.[0] || ex || {};

                    // Tracking-aware metric line — reuse the same resolution
                    // the logging screen uses so cardio/time never shows "reps".
                    const trackingArray = resolveTrackingType(
                      ex,
                      exerciseLibrary,
                    );
                    const isWR = trackingArray.includes("Weight & Reps");
                    const isTO = trackingArray.includes("Time Only");
                    const isDT = trackingArray.includes("Distance & Time");
                    const isCal = trackingArray.includes("Calories");

                    const dist = firstSet.distance || ex.distance || 0;
                    const mins = firstSet.timeMins || ex.timeMins || 0;
                    const secs = firstSet.timeSecs || ex.timeSecs || 0;
                    const cals = firstSet.calories || ex.calories || 0;
                    const reps = firstSet.reps || ex.reps || 0;
                    const weight = firstSet.weight || ex.weight || 0;
                    const rest = ex.rest || 0;

                    let details: string[] = [];
                    if (isWR) {
                      if (weight > 0) details.push(`${weight}kg`);
                      if (reps) details.push(`${reps} reps`);
                    }
                    if (isDT) {
                      if (dist) details.push(`${dist}m`);
                      if (mins || secs)
                        details.push(
                          `${mins ? mins + "m " : ""}${secs ? secs + "s" : ""}`.trim(),
                        );
                    }
                    if (isTO && (mins || secs))
                      details.push(
                        `${mins ? mins + "m " : ""}${secs ? secs + "s" : ""}`.trim(),
                      );
                    if (isCal && cals) details.push(`${cals} cals`);
                    const detailStr = details.join(", ");

                    return (
                      <div
                        key={exIdx}
                        className="flex justify-between items-start gap-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center shrink-0">
                            <Dumbbell className="h-5 w-5 text-muted-foreground/50" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm leading-tight">
                              {libEx ? libEx.name : ex.name || "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {setsCount} sets
                              {detailStr ? ` × ${detailStr}` : ""}
                              {rest ? ` · ${rest}s rest` : ""}
                              {ex.eachSide ? " · each side" : ""}
                            </span>
                            {ex.coachingNotes && (
                              <span className="text-xs text-primary/80 mt-0.5 leading-snug">
                                {ex.coachingNotes}
                              </span>
                            )}
                          </div>
                        </div>
                        {ex.linkedToNext && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-sm shrink-0">
                            Superset
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    {onStartHere && (
                      <Button
                        size="sm"
                        className="gap-1.5 font-bold"
                        onClick={() => onStartHere(idx)}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" /> Start here
                      </Button>
                    )}
                    {onToggleSkip && sectionId != null && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 font-medium ml-auto"
                        onClick={() => onToggleSkip(sectionId)}
                      >
                        {isSkipped ? (
                          <>
                            <Eye className="h-3.5 w-3.5" /> Un-skip
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3.5 w-3.5" /> Skip
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
