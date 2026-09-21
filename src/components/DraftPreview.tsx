/**
 * Read-only preview of an AI-drafted programme — weeks → days → sections →
 * exercises. Shown alongside the chat so the coach sees what the AI built.
 */
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { ProgrammeDraft } from "@/lib/coachAgent";

const fmtSet = (ex: any): string => {
  if (ex.isSection) return "";
  const parts: string[] = [];
  if (ex.sets) parts.push(`${ex.sets}×`);
  const tt = Array.isArray(ex.trackingType)
    ? ex.trackingType
    : [ex.trackingType].filter(Boolean);
  const isTime = tt.some((t: string) =>
    String(t).toLowerCase().includes("time"),
  );
  const isDist = tt.some((t: string) =>
    String(t).toLowerCase().includes("distance"),
  );
  const isCal = tt.some((t: string) => String(t).toLowerCase().includes("cal"));

  if (isTime) {
    const mins = Number(ex.timeMins) || 0;
    const secs = Number(ex.timeSecs) || 0;
    if (mins) parts.push(`${mins}m ${secs}s`);
    else parts.push(`${secs}s`);
  } else if (isDist) {
    parts.push(`${ex.distance || 0}m`);
  } else if (isCal) {
    parts.push(`${ex.reps || 0} cal`);
  } else {
    parts.push(`${ex.reps ?? 0}${ex.eachSide ? "/side" : ""}`);
  }
  if (ex.weight) parts.push(`@ ${ex.weight}kg`);
  return parts.join(" ");
};

const blockColor: Record<string, string> = {
  "Warm Up": "bg-muted text-muted-foreground",
  "Fire Up": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Lift: "bg-primary/10 text-primary",
  "Burn 1": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Burn 2": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Finisher: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export const DraftPreview = ({
  draft,
  unmatchedIds = [],
}: {
  draft: ProgrammeDraft | null;
  unmatchedIds?: string[];
}) => {
  if (!draft) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Your drafted programme will appear here as you chat.
        </p>
      </div>
    );
  }

  const workouts = draft.workouts || [];
  // Group by week.
  const byWeek: Record<number, typeof workouts> = {};
  workouts.forEach((w) => {
    const wk = w.week || 1;
    if (!byWeek[wk]) byWeek[wk] = [];
    byWeek[wk].push(w);
  });
  const weekNums = Object.keys(byWeek)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-lg font-bold">
            {draft.name || "Drafted Programme"}
          </h3>
          {draft.stream && <Badge variant="secondary">{draft.stream}</Badge>}
          <Badge variant="outline">
            {draft.weeks || weekNums.length}w · {draft.daysPerWeek || "?"}d
          </Badge>
        </div>

        {unmatchedIds.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {unmatchedIds.length} exercise(s) not found in the library:{" "}
              {unmatchedIds.join(", ")}. They'll need matching before saving.
            </span>
          </div>
        )}

        {weekNums.map((wk) => (
          <div key={wk} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Week {wk}
            </p>
            {(byWeek[wk] || [])
              .sort((a, b) => (a.day || 0) - (b.day || 0))
              .map((w, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <p className="mb-2 text-sm font-semibold">
                    Day {w.day} — {w.name || "Session"}
                    {w.minDays != null && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        min {w.minDays}d/wk
                      </Badge>
                    )}
                  </p>
                  <div className="space-y-1">
                    {(w.exercises || []).map((ex: any, j: number) => (
                      <div
                        key={j}
                        className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-xs ${
                          ex.isSection
                            ? "mt-2 border-b border-border font-semibold uppercase tracking-wide text-muted-foreground"
                            : ""
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {ex.isSection ? (
                            ex.name
                          ) : (
                            <>
                              {ex.blockType && (
                                <span
                                  className={`mr-1.5 inline-block rounded px-1 py-0.5 text-[10px] font-medium ${
                                    blockColor[ex.blockType] ||
                                    "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {ex.blockType}
                                </span>
                              )}
                              {ex.name}
                              {ex.eachSide && (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  (each side)
                                </span>
                              )}
                            </>
                          )}
                        </span>
                        {!ex.isSection && (
                          <span className="shrink-0 font-mono text-muted-foreground">
                            {fmtSet(ex)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
