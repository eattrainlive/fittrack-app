import { useEffect, useState } from "react";
import {
  Target,
  Scale,
  Footprints,
  Dumbbell,
  Salad,
  ChevronRight,
  Check,
  Pencil,
  Loader2,
  TrendingUp,
  Flame,
  Heart,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getMemberGoals,
  getHabitLibrary,
  saveMemberGoals,
  type MemberGoals,
  type PrimaryGoal,
} from "@/lib/memberGoals";
import { getMemberSummary, type ProgressSummary } from "@/lib/trialSummary";

const PRIMARY_GOAL_OPTIONS: {
  value: PrimaryGoal;
  label: string;
  emoji: string;
}[] = [
  { value: "fat_loss", label: "Fat loss", emoji: "🔥" },
  { value: "strength", label: "Strength", emoji: "💪" },
  { value: "fitness", label: "Fitness", emoji: "🏃" },
  { value: "health", label: "Health", emoji: "❤️" },
];

const FOCUS_AREA_OPTIONS = [
  "Legs",
  "Core",
  "Upper body",
  "Mobility",
  "Conditioning",
  "Posture",
  "Back",
  "Shoulders",
];

const fmtNum = (n?: number | null) => (n == null ? "" : String(n));

type Habit = { id: number; name: string };

export function MemberGoalsCard({
  onSaved,
}: {
  onSaved?: (g: MemberGoals | null) => void;
}) {
  const [goals, setGoals] = useState<MemberGoals | null>(null);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // form state — picked holds the habit NAME (or custom text), never the id
  const [weight, setWeight] = useState("");
  const [focus, setFocus] = useState("");
  const [stepTarget, setStepTarget] = useState("");
  const [sessionsPerWeek, setSessionsPerWeek] = useState("");
  const [calorieTarget, setCalorieTarget] = useState("");
  const [picked, setPicked] = useState<(string | null)[]>([null, null, null]);
  const [customMode, setCustomMode] = useState<boolean[]>([
    false,
    false,
    false,
  ]);
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | "">("");
  const [goalText, setGoalText] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);

  const complete = !!goals?.set_at;

  useEffect(() => {
    (async () => {
      const g = await getMemberGoals();
      setGoals(g);
      if (g) {
        setWeight(g.start_weight != null ? String(g.start_weight) : "");
        setFocus(g.focus || "");
        setStepTarget(fmtNum(g.step_target));
        setSessionsPerWeek(fmtNum(g.sessions_per_week));
        setCalorieTarget(fmtNum(g.calorie_target));
        setPrimaryGoal((g.primary_goal as PrimaryGoal) || "");
        setGoalText(g.goal_text || "");
        setTargetWeight(g.target_weight != null ? String(g.target_weight) : "");
        setTargetDate(g.target_date || "");
        setFocusAreas(Array.isArray(g.focus_areas) ? g.focus_areas : []);
        const p: (string | null)[] = [
          g.habit_1 ?? null,
          g.habit_2 ?? null,
          g.habit_3 ?? null,
        ];
        setPicked(p);
        // If a stored habit isn't a known library name, treat it as custom text.
        setCustomMode(
          p.map((t) => {
            if (!t) return false;
            return !habits.some(
              (h) => h.name.toLowerCase() === t!.toLowerCase(),
            );
          }),
        );
      }
      onSaved?.(g);
      // Load progress summary for the progress-vs-goals panel.
      try {
        const s = await getMemberSummary();
        setSummary(s);
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSaved]);

  useEffect(() => {
    getHabitLibrary().then((h) =>
      setHabits(
        (h || [])
          .filter((x: any) => x && x.id != null)
          .map((x: any) => ({ id: Number(x.id), name: String(x.name || x.id) }))
          .sort((a: Habit, b: Habit) => a.id - b.id),
      ),
    );
  }, []);

  const resetForm = (g?: MemberGoals | null) => {
    setWeight(g?.start_weight != null ? String(g.start_weight) : "");
    setFocus(g?.focus || "");
    setStepTarget(fmtNum(g?.step_target));
    setSessionsPerWeek(fmtNum(g?.sessions_per_week));
    setCalorieTarget(fmtNum(g?.calorie_target));
    setPrimaryGoal((g?.primary_goal as PrimaryGoal) || "");
    setGoalText(g?.goal_text || "");
    setTargetWeight(g?.target_weight != null ? String(g.target_weight) : "");
    setTargetDate(g?.target_date || "");
    setFocusAreas(Array.isArray(g?.focus_areas) ? g!.focus_areas! : []);
    const p: (string | null)[] = [
      g?.habit_1 ?? null,
      g?.habit_2 ?? null,
      g?.habit_3 ?? null,
    ];
    setPicked(p);
    setCustomMode(
      p.map((t) => {
        if (!t) return false;
        return !habits.some((h) => h.name.toLowerCase() === t!.toLowerCase());
      }),
    );
  };

  const openDialog = () => {
    resetForm(goals);
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      const sw = parseFloat(weight);
      const tw = parseFloat(targetWeight);
      const g = await saveMemberGoals({
        startWeight: sw > 0 ? sw : null,
        focus: focus.trim() || null,
        stepTarget: stepTarget ? parseInt(stepTarget, 10) : null,
        sessionsPerWeek: sessionsPerWeek ? parseInt(sessionsPerWeek, 10) : null,
        calorieTarget: calorieTarget ? parseInt(calorieTarget, 10) : null,
        habitTexts: picked.map((h) => (h ? h.trim() : null)),
        primaryGoal: primaryGoal || null,
        goalText: goalText.trim() || null,
        targetWeight: tw > 0 ? tw : null,
        targetDate: targetDate || null,
        focusAreas: focusAreas.length ? focusAreas : null,
      });
      setGoals(g);
      toast.success("Goals saved 🎯");
      setOpen(false);
      onSaved?.(g);
      // Refresh the progress panel.
      try {
        const s = await getMemberSummary();
        setSummary(s);
      } catch {
        /* ignore */
      }
    } catch (e: any) {
      toast.error("Couldn't save: " + (e?.message || "Unknown error"));
    } finally {
      setBusy(false);
    }
  };

  const habitName = (h?: string | null) => (h ? String(h) : "");

  const hasTargets =
    goals &&
    (goals.step_target ||
      goals.sessions_per_week ||
      goals.calorie_target ||
      goals.habit_1 ||
      goals.habit_2 ||
      goals.habit_3 ||
      goals.start_weight != null ||
      goals.focus ||
      goals.primary_goal ||
      goals.goal_text ||
      goals.target_weight != null ||
      goals.target_date ||
      (Array.isArray(goals.focus_areas) && goals.focus_areas.length));

  // Progress vs goals values
  const g = goals;
  const s = summary;
  const sessActual = s?.sessionsPerWeekActual ?? 0;
  const sessTarget = g?.sessions_per_week;
  const sessOnTrack =
    sessTarget && sessActual >= sessTarget ? "smashing it" : "on track";
  const weightNow = s?.weightNow;
  const weightStart = g?.start_weight;
  const daysLogged = s?.daysLogged ?? 0;
  const streak = s?.bestStreak ?? 0;
  const totalVolume = s?.totalVolumeKg ?? 0;
  const loggedSessions = s?.loggedSessions ?? 0;

  return (
    <>
      {!complete || !hasTargets ? (
        <Card className="bg-primary/10 border-primary/40 border-l-4 border-l-primary">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Your goals
                </p>
                <h2 className="font-heading text-lg sm:text-xl tracking-wide uppercase leading-none mt-0.5">
                  Set your goals 🎯
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Agree these with your coach — your focus, targets and habits.
                  We'll track your progress against them over the next 90 days.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={openDialog} disabled={busy}>
                {complete ? "Update goals" : "Get started"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Your goals
                  </p>
                  <h2 className="font-heading text-lg tracking-wide uppercase leading-none mt-0.5">
                    Progress vs goals
                  </h2>
                  {g!.focus && (
                    <p className="text-sm text-muted-foreground mt-1 italic">
                      "{g!.focus}"
                    </p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-muted-foreground"
                onClick={openDialog}
                disabled={busy}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            </div>

            {/* Hero line */}
            {s && (loggedSessions > 0 || totalVolume > 0) && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                <p className="text-sm font-medium">
                  {loggedSessions} sessions · {fmtKg(totalVolume)} kg lifted
                  this period
                </p>
              </div>
            )}

            {/* Targets vs actual */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {sessTarget && (
                <GoalStat
                  icon={Dumbbell}
                  label="Sessions / week"
                  target={`${sessTarget}/wk`}
                  actual={sessActual ? `${sessActual}/wk` : "—"}
                  status={sessActual >= sessTarget ? "smashing it" : "on track"}
                />
              )}
              {weightStart != null && weightNow != null && (
                <GoalStat
                  icon={Scale}
                  label="Weight"
                  target={`${weightStart} kg`}
                  actual={`${weightNow} kg`}
                  status={
                    weightNow < weightStart
                      ? "down"
                      : weightNow > weightStart
                        ? "up"
                        : "steady"
                  }
                />
              )}
              {g!.calorie_target && (
                <GoalStat
                  icon={Salad}
                  label="Nutrition days"
                  target={`${g!.calorie_target} kcal`}
                  actual={`${daysLogged} days`}
                  status={daysLogged >= 10 ? "smashing it" : "on track"}
                />
              )}
              {g!.step_target && (
                <GoalStat
                  icon={Footprints}
                  label="Steps / day"
                  target={fmtNum(g!.step_target)}
                  actual="—"
                  status="on track"
                />
              )}
              {streak > 0 && (
                <GoalStat
                  icon={Flame}
                  label="Best streak"
                  target="—"
                  actual={`${streak} days`}
                  status={streak >= 7 ? "smashing it" : "on track"}
                />
              )}
            </div>

            {/* Habits */}
            {(g!.habit_1 || g!.habit_2 || g!.habit_3) && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Heart className="w-3 h-3" /> Your habits
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[g!.habit_1, g!.habit_2, g!.habit_3]
                    .filter((h) => h != null)
                    .map((h) => (
                      <Badge
                        key={h}
                        variant="secondary"
                        className="font-normal"
                      >
                        {habitName(h)}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Review due */}
            {g!.review_due && (
              <p className="text-xs text-muted-foreground pt-2 border-t border-border/60">
                Next review:{" "}
                {new Date(g!.review_due + "T00:00:00").toLocaleDateString(
                  "en-GB",
                  { day: "numeric", month: "long", year: "numeric" },
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              {complete ? "Update your goals" : "Set your goals"}
            </DialogTitle>
            <DialogDescription>
              Agree these with your coach. You can edit them any time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="focus" className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Main focus / why
              </Label>
              <Input
                id="focus"
                placeholder="e.g. Get stronger & feel more confident"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bw" className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" /> Start weight (kg)
              </Label>
              <Input
                id="bw"
                type="number"
                inputMode="decimal"
                placeholder="e.g. 78.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                id="step"
                icon={<Footprints className="w-4 h-4 text-primary" />}
                label="Steps/day"
                value={stepTarget}
                onChange={setStepTarget}
                placeholder="8000"
              />
              <Field
                id="sess"
                icon={<Dumbbell className="w-4 h-4 text-primary" />}
                label="Sessions/wk"
                value={sessionsPerWeek}
                onChange={setSessionsPerWeek}
                placeholder="3"
              />
            </div>

            <Field
              id="kcal"
              icon={<Salad className="w-4 h-4 text-primary" />}
              label="Daily calorie target (optional)"
              value={calorieTarget}
              onChange={setCalorieTarget}
              placeholder="2000"
            />

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Pick up to 3 habits to build (or type your own)
              </Label>
              {habits.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No habit library loaded yet — you can type custom habits
                  below.
                </p>
              )}
              {[0, 1, 2].map((slot) => (
                <div key={slot} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Habit {slot + 1}
                    {slot > 0 ? " (optional)" : ""}
                  </Label>
                  {customMode[slot] ? (
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Type your own habit…"
                        value={picked[slot] ?? ""}
                        onChange={(e) =>
                          setPicked((p) =>
                            p.map((x, i) => (i === slot ? e.target.value : x)),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          setCustomMode((m) =>
                            m.map((x, i) => (i === slot ? false : x)),
                          );
                          setPicked((p) =>
                            p.map((x, i) => (i === slot ? null : x)),
                          );
                        }}
                      >
                        List
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={
                          picked[slot] &&
                          habits.some(
                            (h) =>
                              h.name.toLowerCase() ===
                              picked[slot]!.toLowerCase(),
                          )
                            ? picked[slot]!
                            : ""
                        }
                        onChange={(e) =>
                          setPicked((p) =>
                            p.map((x, i) =>
                              i === slot ? e.target.value || null : x,
                            ),
                          )
                        }
                      >
                        <option value="">— None —</option>
                        {habits.map((h) => (
                          <option key={h.id} value={h.name}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          setCustomMode((m) =>
                            m.map((x, i) => (i === slot ? true : x)),
                          );
                          setPicked((p) =>
                            p.map((x, i) => (i === slot ? null : x)),
                          );
                        }}
                      >
                        Custom
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={busy}>
              {busy ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
                </span>
              ) : (
                "Save goals"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const fmtKg = (n: number) => n.toLocaleString();

function GoalStat({
  icon: Icon,
  label,
  target,
  actual,
  status,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  target: string;
  actual: string;
  status: string;
}) {
  return (
    <div className="space-y-1 rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-heading text-base leading-none">{actual}</span>
        <span className="text-xs text-muted-foreground">/ {target}</span>
      </div>
      <p className="text-[10px] text-primary font-medium capitalize">
        {status}
      </p>
    </div>
  );
}

function Field({
  id,
  icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-2 text-sm">
        {icon} {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default MemberGoalsCard;
