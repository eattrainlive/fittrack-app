import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  Timer as TimerIcon,
} from "lucide-react";

type ConditioningType = "AMRAP" | "For Time" | "EMOM";

interface ConditioningTimerProps {
  type: ConditioningType;
  capMins?: number;
  /** Called when the member records a score for this block. */
  onSaveResult: (result: any) => void;
  /** Previously saved result (if re-opening a block). */
  initialResult?: any;
}

const fmtClock = (totalSecs: number) => {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const beep = (pattern: number | number[] = 200) => {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
};

export function ConditioningTimer({
  type,
  capMins,
  onSaveResult,
  initialResult,
}: ConditioningTimerProps) {
  // ── Timer state ──
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds elapsed (for For Time / EMOM)
  const [remaining, setRemaining] = useState((capMins || 0) * 60); // for AMRAP countdown
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Score state ──
  const [rounds, setRounds] = useState<string>(
    initialResult?.rounds != null ? String(initialResult.rounds) : "",
  );
  const [reps, setReps] = useState<string>(
    initialResult?.reps != null ? String(initialResult.reps) : "",
  );
  const [emomCompleted, setEmomCompleted] = useState<boolean>(
    initialResult?.completed ?? false,
  );
  const [finishedTime, setFinishedTime] = useState<number | null>(
    initialResult?.timeSecs ?? null,
  );
  const [saved, setSaved] = useState(!!initialResult);

  // EMOM per-minute cue
  const lastMinuteRef = useRef(0);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    clearTick();
  }, [clearTick]);

  const reset = useCallback(() => {
    stop();
    setElapsed(0);
    setRemaining((capMins || 0) * 60);
    lastMinuteRef.current = 0;
    setFinishedTime(null);
    setSaved(false);
  }, [capMins, stop]);

  const start = useCallback(() => {
    if (running) return;
    setRunning(true);
    setSaved(false);
    tickRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
      if (type === "AMRAP" || type === "EMOM") {
        setRemaining((r) => {
          if (r <= 1) {
            // time's up
            beep([100, 50, 100, 50, 200]);
            stop();
            return 0;
          }
          return r - 1;
        });
      }
      // EMOM per-minute cue
      if (type === "EMOM") {
        setElapsed((e) => {
          const newMin = Math.floor((e + 1) / 60);
          if (newMin > lastMinuteRef.current && newMin > 0) {
            lastMinuteRef.current = newMin;
            beep(150);
          }
          return e + 1;
        });
      }
    }, 1000);
  }, [running, type, stop]);

  // For Time: record finish
  const finishForTime = () => {
    stop();
    setFinishedTime(elapsed);
    beep([100, 50, 100, 50, 200]);
  };

  useEffect(() => {
    return () => clearTick();
  }, [clearTick]);

  // Auto-stop AMRAP at 0
  useEffect(() => {
    if ((type === "AMRAP" || type === "EMOM") && remaining === 0 && running) {
      stop();
    }
  }, [remaining, running, type, stop]);

  const handleSave = () => {
    let result: any;
    if (type === "AMRAP") {
      result = {
        type: "AMRAP",
        rounds: parseInt(rounds) || 0,
        reps: parseInt(reps) || 0,
        capMins: capMins || null,
      };
    } else if (type === "For Time") {
      result = {
        type: "For Time",
        timeSecs: finishedTime ?? elapsed,
        capMins: capMins || null,
      };
    } else {
      result = {
        type: "EMOM",
        completed: emomCompleted,
        mins: capMins || null,
      };
    }
    onSaveResult(result);
    setSaved(true);
  };

  const isCountdown = type === "AMRAP" || type === "EMOM";
  const displayTime = isCountdown ? remaining : elapsed;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TimerIcon className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm uppercase tracking-wider text-primary">
            {type}
            {capMins ? ` · ${capMins} min` : ""}
          </span>
        </div>
        {saved && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded-full">
            Score saved
          </span>
        )}
      </div>

      {/* Big clock */}
      <div className="flex flex-col items-center gap-1 py-2">
        <span className="font-heading text-5xl tabular-nums tracking-wider text-foreground">
          {fmtClock(displayTime)}
        </span>
        {type === "EMOM" && running && (
          <span className="text-xs text-muted-foreground">
            Minute {Math.floor(elapsed / 60) + 1}
          </span>
        )}
        {type === "For Time" && finishedTime != null && (
          <span className="text-xs font-bold text-primary">
            Finished in {fmtClock(finishedTime)}
          </span>
        )}
      </div>

      {/* Timer controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          size="sm"
          variant={running ? "outline" : "default"}
          onClick={running ? stop : start}
          className="gap-1"
        >
          {running ? (
            <>
              <Pause className="h-4 w-4" /> Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" /> Start
            </>
          )}
        </Button>
        <Button size="sm" variant="ghost" onClick={reset} className="gap-1">
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
        {type === "For Time" && (
          <Button
            size="sm"
            variant="default"
            onClick={finishForTime}
            disabled={!running && finishedTime != null}
            className="gap-1"
          >
            <Check className="h-4 w-4" /> Finish
          </Button>
        )}
      </div>

      {/* Score capture */}
      <div className="border-t border-border/50 pt-3">
        {type === "AMRAP" && (
          <div className="flex items-end gap-3 justify-center">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-muted-foreground uppercase">
                Rounds
              </span>
              <Input
                type="number"
                inputMode="numeric"
                value={rounds}
                onChange={(e) => setRounds(e.target.value)}
                className="w-24 text-center text-lg font-bold"
                placeholder="0"
              />
            </label>
            <span className="text-xl font-bold text-muted-foreground pb-2">
              +
            </span>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-muted-foreground uppercase">
                Reps
              </span>
              <Input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="w-24 text-center text-lg font-bold"
                placeholder="0"
              />
            </label>
          </div>
        )}

        {type === "For Time" && (
          <p className="text-center text-sm text-muted-foreground">
            {finishedTime != null
              ? `Time: ${fmtClock(finishedTime)}`
              : "Hit Finish when you complete the work."}
          </p>
        )}

        {type === "EMOM" && (
          <label className="flex items-center gap-2 justify-center cursor-pointer">
            <input
              type="checkbox"
              checked={emomCompleted}
              onChange={(e) => setEmomCompleted(e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
            <span className="text-sm font-medium">All rounds completed</span>
          </label>
        )}

        <Button
          size="sm"
          variant="default"
          onClick={handleSave}
          className="w-full mt-3 gap-1 font-bold"
        >
          <Check className="h-4 w-4" /> Save Score
        </Button>
      </div>
    </div>
  );
}

/** Format a saved conditioning result for display in history. */
export function formatConditioningResult(result: any): string | null {
  if (!result?.type) return null;
  switch (result.type) {
    case "AMRAP":
      return `AMRAP${result.capMins ? ` ${result.capMins}` : ""}: ${result.rounds || 0} rounds${result.reps ? ` + ${result.reps}` : ""}`;
    case "For Time": {
      const t = result.timeSecs ?? 0;
      const m = Math.floor(t / 60);
      const s = t % 60;
      return `For Time: ${m}:${String(s).padStart(2, "0")}`;
    }
    case "EMOM":
      return `EMOM${result.mins ? ` ${result.mins}` : ""}: ${result.completed ? "complete" : "incomplete"}`;
    case "Freestyle": {
      if (result.scoreType === "time") {
        const t = result.timeSecs ?? 0;
        const m = Math.floor(t / 60);
        const s = t % 60;
        return `Score: ${m}:${String(s).padStart(2, "0")}`;
      }
      const unit = result.scoreType === "reps" ? "reps" : "rounds";
      return `Score: ${result.value ?? 0} ${unit}`;
    }
    default:
      return null;
  }
}

/**
 * Freestyle score capture — the member picks the score type (Reps / Rounds / Time)
 * and enters one value. No coach setup needed; always available on Freestyle blocks.
 */
export function FreestyleScore({
  initialResult,
  onSaveResult,
}: {
  initialResult?: any;
  onSaveResult: (result: any) => void;
}) {
  const [scoreType, setScoreType] = useState<"reps" | "rounds" | "time">(
    initialResult?.scoreType || "rounds",
  );
  const [value, setValue] = useState<string>(
    initialResult?.value != null ? String(initialResult.value) : "",
  );
  const [mins, setMins] = useState<string>(
    initialResult?.timeSecs != null
      ? String(Math.floor(initialResult.timeSecs / 60))
      : "",
  );
  const [secs, setSecs] = useState<string>(
    initialResult?.timeSecs != null ? String(initialResult.timeSecs % 60) : "",
  );
  const [saved, setSaved] = useState(!!initialResult);

  const handleSave = () => {
    let result: any;
    if (scoreType === "time") {
      const totalSecs = (parseInt(mins) || 0) * 60 + (parseInt(secs) || 0);
      result = { type: "Freestyle", scoreType: "time", timeSecs: totalSecs };
    } else {
      result = {
        type: "Freestyle",
        scoreType,
        value: parseFloat(value) || 0,
      };
    }
    onSaveResult(result);
    setSaved(true);
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm uppercase tracking-wider text-primary">
          Log your score
        </span>
        {saved && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded-full">
            Score saved
          </span>
        )}
      </div>

      {/* Type toggle */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {(["rounds", "reps", "time"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setScoreType(t);
              setSaved(false);
            }}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide capitalize transition-colors ${
              scoreType === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Value input */}
      {scoreType === "time" ? (
        <div className="flex items-end gap-2 justify-center">
          <label className="flex flex-col gap-1 items-center">
            <span className="text-xs font-bold text-muted-foreground uppercase">
              Mins
            </span>
            <Input
              type="number"
              inputMode="numeric"
              value={mins}
              onChange={(e) => {
                setMins(e.target.value);
                setSaved(false);
              }}
              className="w-20 text-center text-lg font-bold"
              placeholder="0"
            />
          </label>
          <span className="text-xl font-bold text-muted-foreground pb-2">
            :
          </span>
          <label className="flex flex-col gap-1 items-center">
            <span className="text-xs font-bold text-muted-foreground uppercase">
              Secs
            </span>
            <Input
              type="number"
              inputMode="numeric"
              value={secs}
              onChange={(e) => {
                setSecs(e.target.value);
                setSaved(false);
              }}
              className="w-20 text-center text-lg font-bold"
              placeholder="0"
            />
          </label>
        </div>
      ) : (
        <label className="flex flex-col gap-1 items-center">
          <span className="text-xs font-bold text-muted-foreground uppercase">
            {scoreType === "reps" ? "Reps" : "Rounds"}
          </span>
          <Input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
            }}
            className="w-28 text-center text-lg font-bold"
            placeholder="0"
          />
        </label>
      )}

      <Button
        size="sm"
        variant="default"
        onClick={handleSave}
        className="w-full mt-1 gap-1 font-bold"
      >
        <Check className="h-4 w-4" /> Save Score
      </Button>
    </div>
  );
}
