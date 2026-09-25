/**
 * Freestyle conditioning block — Everfit-style.
 *
 * Renders the block's written workout (from the section `description`) as
 * readable text, lists the movements below as tappable VIDEO REFERENCES only
 * (no set/rep logging), and provides ONE optional score the member logs for
 * the whole block. The member picks the score type (Reps / Rounds / Time)
 * client-side so the builder can't get it wrong.
 *
 * The score persists on the member's workout record as
 * `blockScore: { type, value, timeSecs? }` keyed to the section id.
 */
import { Play, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export interface FreestyleScore {
  type: "reps" | "rounds" | "time";
  value: number;
  timeSecs?: number;
}

interface FreestyleBlockProps {
  /** The section's written workout (multi-line). */
  description?: string;
  /** Reference exercise rows — each has a library id in `name` + optional video. */
  exercises: any[];
  /** The exercise library (to resolve names + video URLs). */
  exerciseLibrary: any[];
  /** Existing score for this block (if any). */
  initialScore?: FreestyleScore;
  /** Called when the member logs/updates their score. */
  onSaveScore: (score: FreestyleScore) => void;
}

const SCORE_TYPES: { key: FreestyleScore["type"]; label: string }[] = [
  { key: "rounds", label: "Rounds" },
  { key: "reps", label: "Reps" },
  { key: "time", label: "Time" },
];

const getEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const yt = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/,
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const loom = url.match(/loom\.com\/share\/([\w-]+)/);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
};

export const FreestyleBlock = ({
  description,
  exercises,
  exerciseLibrary,
  initialScore,
  onSaveScore,
}: FreestyleBlockProps) => {
  const [scoreType, setScoreType] = useState<FreestyleScore["type"]>(
    initialScore?.type || "rounds",
  );
  const [value, setValue] = useState(String(initialScore?.value || ""));
  const [mins, setMins] = useState(
    initialScore?.timeSecs
      ? String(Math.floor(initialScore.timeSecs / 60))
      : "",
  );
  const [secs, setSecs] = useState(
    initialScore?.timeSecs ? String(initialScore.timeSecs % 60) : "",
  );
  const [saved, setSaved] = useState(!!initialScore);
  const [openVideo, setOpenVideo] = useState<string | null>(null);

  const handleSave = () => {
    const numVal = parseFloat(value) || 0;
    const timeSecs = (parseInt(mins) || 0) * 60 + (parseInt(secs) || 0);
    onSaveScore({
      type: scoreType,
      value: scoreType === "time" ? timeSecs : numVal,
      timeSecs: scoreType === "time" ? timeSecs : undefined,
    });
    setSaved(true);
  };

  return (
    <div className="space-y-5">
      {/* The written workout */}
      {description && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-medium">
            {description}
          </p>
        </div>
      )}

      {/* Video references */}
      {exercises.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Movements — tap for video
          </p>
          {exercises.map((ex, i) => {
            const libEx = exerciseLibrary.find(
              (e) => String(e.id) === String(ex.name),
            );
            const name = libEx?.name || ex.label || ex.name || "Exercise";
            const videoUrl = libEx?.video || libEx?.video_url || "";
            const embed = getEmbedUrl(videoUrl);
            return (
              <div key={ex.id || i}>
                <button
                  className="w-full flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() =>
                    embed && setOpenVideo(openVideo === embed ? null : embed)
                  }
                >
                  <span className="font-heading text-lg text-muted-foreground w-6 shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-bold text-sm flex-1 leading-tight">
                    {name}
                  </span>
                  {embed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-primary shrink-0">
                      <Play className="h-3.5 w-3.5" /> Video
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      No video
                    </span>
                  )}
                </button>
                {openVideo && openVideo === embed && embed && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border">
                    <iframe
                      src={embed}
                      className="w-full aspect-video"
                      allowFullScreen
                      title={name}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Score logging */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Log your score</p>
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>

        {/* Type toggle */}
        <div className="flex bg-muted/50 rounded-md p-0.5 border border-border">
          {SCORE_TYPES.map((t) => (
            <button
              key={t.key}
              className={`flex-1 text-xs uppercase font-bold py-1.5 rounded-sm transition-colors ${
                scoreType === t.key
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setScoreType(t.key);
                setSaved(false);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Input matching the type */}
        {scoreType === "time" ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              className="w-20 h-10 text-center text-lg font-bold rounded-md border border-border bg-background"
              value={mins}
              placeholder="0"
              onChange={(e) => {
                setMins(e.target.value);
                setSaved(false);
              }}
            />
            <span className="text-sm font-bold text-muted-foreground">min</span>
            <input
              type="number"
              inputMode="numeric"
              className="w-20 h-10 text-center text-lg font-bold rounded-md border border-border bg-background"
              value={secs}
              placeholder="0"
              onChange={(e) => {
                setSecs(e.target.value);
                setSaved(false);
              }}
            />
            <span className="text-sm font-bold text-muted-foreground">sec</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              className="w-24 h-10 text-center text-lg font-bold rounded-md border border-border bg-background"
              value={value}
              placeholder="0"
              step={scoreType === "rounds" ? 0.5 : 1}
              onChange={(e) => {
                setValue(e.target.value);
                setSaved(false);
              }}
            />
            <span className="text-sm font-bold text-muted-foreground">
              {scoreType === "rounds" ? "rounds" : "reps"}
            </span>
          </div>
        )}

        <Button size="sm" className="w-full" onClick={handleSave}>
          {saved ? "Update score" : "Save score"}
        </Button>
      </div>
    </div>
  );
};
