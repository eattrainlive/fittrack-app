/**
 * Variety-check badge — shows a non-blocking warning in the week editor when
 * a movement family is overused, an exercise is duplicated, or two
 * same-joint isolations appear in one session. Self-contained: reads the
 * current week's workouts and runs the check via `get-alternates` (with a
 * local fallback).
 */
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { checkVariety, type VarietyIssue } from "@/lib/smartAlternates";

interface VarietyBadgeProps {
  weekWorkouts: any[];
  allExercises: any[];
}

export const VarietyBadge = ({
  weekWorkouts,
  allExercises,
}: VarietyBadgeProps) => {
  const [issues, setIssues] = useState<VarietyIssue[]>([]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!weekWorkouts?.length) {
        setIssues([]);
        return;
      }
      const draft = weekWorkouts.map((w: any) => ({
        day: w.day,
        exercises: (w.exercises || []).map((e: any) => {
          // Attach movement_family from the library for the check.
          const libEx = allExercises.find(
            (x) => String(x.id) === String(e.name),
          );
          return {
            ...e,
            id: e.name || e.id,
            name: libEx?.name || e.name,
            movementType: libEx?.movementType || e.movementType,
          };
        }),
      }));
      const res = await checkVariety(draft);
      if (active) setIssues(res.issues);
    };
    const t = setTimeout(run, 400);
    return () => {
      active = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(weekWorkouts)]);

  if (!issues.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <Badge
        variant="outline"
        className="gap-1 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
      >
        <AlertTriangle className="h-3 w-3" />
        {issues.length} {issues.length === 1 ? "variety tip" : "variety tips"}
      </Badge>
      {issues.slice(0, 3).map((issue, i) => (
        <span
          key={i}
          className="text-xs text-amber-700 dark:text-amber-400/80 truncate max-w-[240px]"
          title={issue.message}
        >
          {issue.message}
        </span>
      ))}
    </div>
  );
};
