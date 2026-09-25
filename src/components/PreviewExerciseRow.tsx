import { PlayCircle, Dumbbell } from "lucide-react";

interface PreviewExerciseRowProps {
  ex: any;
  exIdx: number;
  isFreestyle: boolean;
  exerciseLibrary: any[];
  onOpenVideo: (url: string, title: string) => void;
}

/**
 * A single exercise row in the pre-start session preview.
 *
 * For Freestyle sections, movements are shown as reference-only (name +
 * video icon, no "N sets" / metric line). For everything else, the
 * tracking-aware metric line is built from the exercise's entered values.
 */
export function PreviewExerciseRow({
  ex,
  exIdx,
  isFreestyle,
  exerciseLibrary,
  onOpenVideo,
}: PreviewExerciseRowProps) {
  const libEx = exerciseLibrary.find((e) => String(e.id) === String(ex.name));

  if (isFreestyle) {
    return (
      <div
        key={exIdx}
        className="flex gap-3 items-center group cursor-pointer"
        onClick={() => {
          if (libEx?.videoUrl) onOpenVideo(libEx.videoUrl, libEx.name);
        }}
      >
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border">
          {libEx?.videoUrl ? (
            <PlayCircle className="h-5 w-5 text-primary opacity-80" />
          ) : (
            <Dumbbell className="h-5 w-5 text-muted-foreground opacity-50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">
            {libEx?.name || ex.label || ex.name || "Exercise"}
          </p>
          <span className="text-xs text-muted-foreground font-medium">
            Reference
          </span>
        </div>
      </div>
    );
  }

  const rawTrack = ex.trackingType ?? libEx?.trackingType ?? "Weight & Reps";
  const trackingArray = (
    Array.isArray(rawTrack) ? rawTrack : String(rawTrack).split(/[;,]/)
  )
    .map((s) => s.trim())
    .filter(Boolean);

  const dist = ex.distance || 0;
  const mins = ex.timeMins || 0;
  const secs = ex.timeSecs || 0;
  const cals =
    ex.calories || (trackingArray.includes("Calories") ? ex.reps || 0 : 0);
  const reps = ex.reps || 0;

  const metrics: string[] = [];
  if ((ex.weight || 0) > 0) metrics.push(`${ex.weight}kg`);
  if (dist) metrics.push(`${dist}m`);
  if (mins || secs)
    metrics.push(`${mins ? mins + "m " : ""}${secs ? secs + "s" : ""}`.trim());
  if (cals) metrics.push(`${cals} cals`);
  if (!metrics.length && reps) metrics.push(`${reps} reps`);

  let detailText = "";
  if (metrics.length > 0) {
    detailText =
      ex.sets && ex.sets > 1
        ? `${ex.sets} × ${metrics.join(", ")}`
        : metrics.join(", ");
  } else {
    detailText = `${ex.sets || 1} sets`;
  }

  const isSupersetItem = ex.linkedToNext || (exIdx > 0 && ex.linkedToNext);

  return (
    <div
      key={exIdx}
      className="flex gap-3 items-center group cursor-pointer"
      onClick={() => {
        if (libEx?.videoUrl) onOpenVideo(libEx.videoUrl, libEx.name);
      }}
    >
      <div className="relative shrink-0">
        {isSupersetItem && (
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0.5 h-full bg-primary rounded-full" />
        )}
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border">
          {libEx?.videoUrl ? (
            <div className="relative w-full h-full flex items-center justify-center group-hover:bg-black/10 transition-colors">
              <PlayCircle className="h-5 w-5 text-primary opacity-80" />
            </div>
          ) : (
            <Dumbbell className="h-5 w-5 text-muted-foreground opacity-50" />
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">
          {libEx?.name || ex.name || "Unknown Exercise"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground font-medium">
            {detailText}
          </span>
          {isSupersetItem && (
            <span className="text-[8px] px-1 py-0 h-4 uppercase bg-primary/10 text-primary border border-primary/20 rounded">
              Superset
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
