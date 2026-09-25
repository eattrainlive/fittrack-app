/**
 * Freestyle block score logger — rendered at the bottom of a Freestyle
 * conditioning section in the member workout view.
 *
 * The member picks how they scored the block (Reps / Rounds / Time) and
 * enters one value. It persists on the workout record as
 * `blockScore: { type, value, timeSecs? }` keyed to the section, so it
 * saves to workout history and shows in Past Lifts.
 *
 * The block counts as done when a score is entered (or Done tapped) — no
 * per-set completion is required for Freestyle.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Dumbbell, Repeat, Timer as TimerIcon } from "lucide-react";

type ScoreType = "reps" | "rounds" | "time";

interface FreestyleScoreProps {
  sectionId: string | number;
  initialScore?: { type: ScoreType; value: number; timeSecs?: number } | null;
  onSave: (score: {
    type: ScoreType;
    value: number;
    timeSecs?: number;
  }) => void;
  onDone: () => void;
}

const TYPES: { key: ScoreType; label: string; icon: any }[] = [
  { key: "rounds", label: "Rounds", icon: Repeat },
  { key: "reps", label: "Reps", icon: Dumbbell },
  { key: "time", label: "Time", icon: TimerIcon },
];

export function FreestyleScore({
  sectionId,
  initialScore,
  onSave,
  onDone,
}: FreestyleScoreProps) {
  const [scoreType, setScoreType] = useState<ScoreType>(
    initialScore?.type || "rounds",
  );
  const [value, setValue] = useState<string>(
    initialScore ? String(initialScore.value) : "",
  );
  const [mins, setMins] = useState<string>(
    initialScore?.timeSecs
      ? String(Math.floor(initialScore.timeSecs / 60))
      : "",
  );
  const [secs, setSecs] = useState<string>(
    initialScore?.timeSecs ? String(initialScore.timeSecs % 60) : "",
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (scoreType === "time") {
      const totalSecs = (parseInt(mins) || 0) * 60 + (parseInt(secs) || 0);
      if (totalSecs <= 0) return;
      onSave({ type: "time", value: totalSecs, timeSecs: totalSecs });
    } else {
      const num = parseFloat(value) || 0;
      if (num <= 0) return;
      onSave({ type: scoreType, value: num });
    }
    setSaved(true);
  };

  const handleDone = () => {
    handleSave();
    onDone();
  };

  return (
    <div className="mt-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
        Log your score
      </p>

      {/* Score type toggle */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {TYPES.map((t) => {
          const Icon = t.icon;
          const active = scoreType === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                setScoreType(t.key);
                setSaved(false);
              }}
              className={`flex items-center justify-center gap-1.5 h-10 rounded-lg border-2 text-xs font-bold uppercase tracking-wide transition-all ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Value input */}
      {scoreType === "time" ? (
        <div className="flex items-center gap-2 mb-3">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="MM"
            value={mins}
            onChange={(e) => {
              setMins(e.target.value);
              setSaved(false);
            }}
            className="text-center text-lg font-bold tabular-nums"
          />
          <span className="text-lg font-bold text-muted-foreground">:</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="SS"
            value={secs}
            onChange={(e) => {
              setSecs(e.target.value);
              setSaved(false);
            }}
            className="text-center text-lg font-bold tabular-nums"
          />
        </div>
      ) : (
        <Input
          type="number"
          inputMode="decimal"
          placeholder={scoreType === "rounds" ? "e.g. 5.5" : "e.g. 120"}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          className="text-center text-lg font-bold tabular-nums mb-3"
        />
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 font-bold"
          onClick={handleSave}
        >
          {saved ? (
            <>
              <Check className="h-4 w-4 mr-1" /> Saved
            </>
          ) : (
            "Save score"
          )}
        </Button>
        <Button className="flex-1 font-bold" onClick={handleDone}>
          <Check className="h-4 w-4 mr-1" /> Done
        </Button>
      </div>
    </div>
  );
}
