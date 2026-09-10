import { useEffect, useState } from "react";
import {
  Target,
  Camera,
  Scale,
  Footprints,
  Dumbbell,
  Salad,
  ChevronRight,
  Check,
  Pencil,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  getTrialGoals,
  getHabitLibrary,
  saveTrialGoals,
  uploadProgressPhoto,
  saveMemberPhoto,
  type TrialGoals,
} from "@/lib/trialGoals";

const STEPS = ["weight", "targets", "habits"] as const;
type Step = (typeof STEPS)[number];

const STEP_META: Record<Step, { n: number; title: string; sub: string }> = {
  weight: {
    n: 1,
    title: "Start weight & photo",
    sub: "Where you're starting — we'll measure change from here.",
  },
  targets: {
    n: 2,
    title: "Your 30-day targets",
    sub: "What you and your coach are aiming for over the next 30 days.",
  },
  habits: {
    n: 3,
    title: "Pick 3 habits",
    sub: "The habits you'll build. They'll also appear in your habit tracker.",
  },
};

type Habit = { id: number; name: string };

const fmtNum = (n?: number | null) => (n == null ? "" : String(n));

export function TrialGoalsCard({
  onSaved,
}: {
  onSaved?: (g: TrialGoals | null) => void;
}) {
  const [goals, setGoals] = useState<TrialGoals | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState<Step>("weight");
  const [busy, setBusy] = useState(false);

  // form state
  const [weight, setWeight] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [stepTarget, setStepTarget] = useState("");
  const [sessionsPerWeek, setSessionsPerWeek] = useState("");
  const [calorieTarget, setCalorieTarget] = useState("");
  const [picked, setPicked] = useState<(string | null)[]>([null, null, null]);
  const [customMode, setCustomMode] = useState<boolean[]>([
    false,
    false,
    false,
  ]);

  const complete = !!goals?.captured_at;

  useEffect(() => {
    (async () => {
      const g = await getTrialGoals();
      setGoals(g);
      if (g) {
        setWeight(g.start_weight != null ? String(g.start_weight) : "");
        setStepTarget(fmtNum(g.step_target));
        setSessionsPerWeek(fmtNum(g.sessions_per_week));
        setCalorieTarget(fmtNum(g.calorie_target));
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
              (h) => h.name.toLowerCase() === t.toLowerCase(),
            );
          }),
        );
      }
      onSaved?.(g);
    })();
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

  const resetForm = (g?: TrialGoals | null) => {
    setStep("weight");
    setPhotoUrl(null);
    setWeight(g?.start_weight != null ? String(g.start_weight) : "");
    setStepTarget(fmtNum(g?.step_target));
    setSessionsPerWeek(fmtNum(g?.sessions_per_week));
    setCalorieTarget(fmtNum(g?.calorie_target));
    setPicked([g?.habit_1 ?? null, g?.habit_2 ?? null, g?.habit_3 ?? null]);
  };

  const openDialog = () => {
    resetForm(goals);
    setEditing(false);
    setOpen(true);
  };
  const editGoals = () => {
    resetForm(goals);
    setEditing(true);
    setStep("targets");
    setOpen(true);
  };

  const goNext = () => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
  };
  const goBack = () => {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadProgressPhoto(file);
      if ("error" in res) {
        toast.error("Photo upload failed: " + res.error);
      } else {
        setPhotoUrl(res.url);
        toast.success("Photo added");
      }
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const sw = parseFloat(weight);
      const g = await saveTrialGoals({
        startWeight: sw > 0 ? sw : null,
        photoUrl: photoUrl || undefined,
        stepTarget: stepTarget ? parseInt(stepTarget, 10) : null,
        sessionsPerWeek: sessionsPerWeek ? parseInt(sessionsPerWeek, 10) : null,
        calorieTarget: calorieTarget ? parseInt(calorieTarget, 10) : null,
        habitTexts: picked.map((h) => (h ? h.trim() : null)),
      });
      setGoals(g);
      toast.success("Starting point saved 🎯");
      setOpen(false);
      onSaved?.(g);
    } catch (e: any) {
      toast.error("Couldn't save: " + (e?.message || "Unknown error"));
    } finally {
      setBusy(false);
    }
  };

  const addProgressPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadProgressPhoto(file);
      if ("error" in res) {
        toast.error("Photo upload failed: " + res.error);
        return;
      }
      await saveMemberPhoto({
        url: res.url,
        date: new Date().toISOString().split("T")[0],
        pose: "front",
        phase: "progress",
      });
      toast.success("Progress photo added — keep them coming 📸");
    } catch (e: any) {
      toast.error("Couldn't save photo: " + (e?.message || "Unknown error"));
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
      goals.start_weight != null);

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
                  Your 30-day starting point
                </p>
                <h2 className="font-heading text-lg sm:text-xl tracking-wide uppercase leading-none mt-0.5">
                  Set your starting point 🎯
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Set these with your coach at induction — where you're starting
                  and what we're aiming for. In 30 days we'll show you how far
                  you've come.
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
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Your starting point
                  </p>
                  <h2 className="font-heading text-lg tracking-wide uppercase leading-none mt-0.5">
                    30-day targets
                  </h2>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-muted-foreground"
                onClick={editGoals}
                disabled={busy}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {goals!.start_weight != null && (
                <Stat
                  icon={Scale}
                  label="Start weight"
                  value={`${goals!.start_weight} kg`}
                />
              )}
              {goals!.step_target && (
                <Stat
                  icon={Footprints}
                  label="Steps/day"
                  value={fmtNum(goals!.step_target)}
                />
              )}
              {goals!.sessions_per_week && (
                <Stat
                  icon={Dumbbell}
                  label="Sessions/wk"
                  value={fmtNum(goals!.sessions_per_week)}
                />
              )}
              {goals!.calorie_target && (
                <Stat
                  icon={Salad}
                  label="Kcal/day"
                  value={fmtNum(goals!.calorie_target)}
                />
              )}
            </div>

            {(goals!.habit_1 || goals!.habit_2 || goals!.habit_3) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[goals!.habit_1, goals!.habit_2, goals!.habit_3]
                  .filter((h) => h != null)
                  .map((h) => (
                    <Badge key={h} variant="secondary" className="font-normal">
                      {habitName(h)}
                    </Badge>
                  ))}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2 border-t border-border/60">
              <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer text-primary">
                <Camera className="w-4 h-4" />
                {busy ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
                  </span>
                ) : (
                  "Add a progress photo"
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={addProgressPhoto}
                  disabled={busy}
                />
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary border border-primary/40 rounded-full px-2 py-0.5">
                Step {STEP_META[step].n}/3
              </span>
              {STEP_META[step].title}
            </DialogTitle>
            <DialogDescription>{STEP_META[step].sub}</DialogDescription>
          </DialogHeader>

          {step === "weight" && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="bw" className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary" /> Body weight (kg)
                </Label>
                <Input
                  id="bw"
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 78.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  This becomes your "before" weight — we'll measure change from
                  here.
                </p>
              </div>
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-5 cursor-pointer hover:bg-muted/60 transition">
                <Camera className="w-7 h-7 text-primary" />
                <span className="text-sm font-medium">
                  {photoUrl
                    ? "Change before photo"
                    : "Add a before photo (optional)"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Private — only you and your coach see this.
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhoto}
                  disabled={busy}
                />
              </label>
              {photoUrl && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Check className="w-4 h-4" /> Before photo ready
                </div>
              )}
            </div>
          )}

          {step === "targets" && (
            <div className="space-y-4 py-2">
              <Field
                id="step"
                icon={<Footprints className="w-4 h-4 text-primary" />}
                label="Daily step target"
                value={stepTarget}
                onChange={setStepTarget}
                placeholder="e.g. 8000"
              />
              <Field
                id="sess"
                icon={<Dumbbell className="w-4 h-4 text-primary" />}
                label="Sessions per week"
                value={sessionsPerWeek}
                onChange={setSessionsPerWeek}
                placeholder="e.g. 3"
              />
              <Field
                id="kcal"
                icon={<Salad className="w-4 h-4 text-primary" />}
                label="Daily calorie target (optional)"
                value={calorieTarget}
                onChange={setCalorieTarget}
                placeholder="e.g. 2000"
              />
              <p className="text-xs text-muted-foreground">
                Your calorie target also sets your nutrition tracker goal.
              </p>
            </div>
          )}

          {step === "habits" && (
            <div className="space-y-4 py-2 max-h-[50vh] overflow-y-auto">
              <p className="text-xs text-muted-foreground">
                Pick up to 3 habits to build. They'll show in your habit tracker
                and count toward your streaks.
              </p>
              {habits.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No habit library loaded yet — you can add these later.
                </p>
              )}
              {[0, 1, 2].map((slot) => (
                <div key={slot} className="space-y-1.5">
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
                          habits.some((h) => h.name === picked[slot])
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
          )}

          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={
                step === "weight" && !editing ? () => setOpen(false) : goBack
              }
              disabled={busy}
            >
              {step === "weight" && !editing ? "Cancel" : "Back"}
            </Button>
            <div className="flex gap-2">
              {step !== "habits" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goNext}
                  disabled={busy}
                >
                  Skip
                </Button>
              )}
              {step === "habits" ? (
                <Button size="sm" onClick={save} disabled={busy}>
                  {busy ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
                    </span>
                  ) : (
                    "Save starting point"
                  )}
                </Button>
              ) : (
                <Button size="sm" onClick={goNext} disabled={busy}>
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <p className="font-heading text-base sm:text-lg leading-none">{value}</p>
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
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2">
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

export default TrialGoalsCard;
