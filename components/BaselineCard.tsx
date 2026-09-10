import { useState } from "react";
import { Camera, Scale, Dumbbell, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  saveBodyweight,
  saveMemberPhoto,
  savePersonalRecord,
  getExercises,
  getActiveProgram,
} from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { setTrialBaselineCapturedAt } from "@/lib/trialBaseline";

type LiftOption = { id: string; label: string };

// Short manual fallback list when there is no active programme yet.
const MANUAL_LIFTS: LiftOption[] = [
  { id: "squat", label: "Squat" },
  { id: "bench", label: "Bench / Chest Press" },
  { id: "deadlift", label: "Deadlift" },
  { id: "row", label: "Row" },
  { id: "ohp", label: "Overhead Press" },
];

const STEPS = ["weight", "photo", "lifts"] as const;
type Step = (typeof STEPS)[number];

const STEP_META: Record<Step, { n: number; title: string; sub: string }> = {
  weight: {
    n: 1,
    title: "Log today's weight",
    sub: "This is your start point — we'll measure change from here.",
  },
  photo: {
    n: 2,
    title: "Grab a starting photo?",
    sub: "Optional — private to you and your coach only.",
  },
  lifts: {
    n: 3,
    title: "Note your lifts",
    sub: "What are you lifting right now? Skip if you like.",
  },
};

const deriveLifts = (): LiftOption[] => {
  const program: any = getActiveProgram();
  if (program?.workouts?.length) {
    const lib = getExercises();
    const byId = new Map<string, any>(lib.map((e: any) => [String(e.id), e]));
    const ids = new Set<string>();
    const lifts: LiftOption[] = [];
    for (const w of program.workouts) {
      for (const ex of w.exercises || []) {
        const id = String(ex.name);
        if (ids.has(id) || ex.isSection) continue;
        const libEx = byId.get(id);
        if (!libEx) continue;
        ids.add(id);
        lifts.push({ id, label: libEx.name });
        if (lifts.length >= 4) break;
      }
      if (lifts.length >= 4) break;
    }
    if (lifts.length) return lifts;
  }
  return MANUAL_LIFTS;
};

export function BaselineCard({ onDismiss }: { onDismiss: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("weight");
  const [weight, setWeight] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [liftWeights, setLiftWeights] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [lifts] = useState<LiftOption[]>(deriveLifts);

  const start = () => {
    setStep("weight");
    setWeight("");
    setPhotoUrl(null);
    setLiftWeights({});
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
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");
      const fileExt = file.name.split(".").pop();
      const filePath = `nutrition-photos/${user.id}/baseline-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("media").getPublicUrl(filePath);
      setPhotoUrl(data.publicUrl);
      toast.success("Photo added");
    } catch (err: any) {
      toast.error("Photo upload failed: " + err.message);
    }
  };

  const finish = async () => {
    setBusy(true);
    try {
      // 1. weight — only if entered
      if (weight && parseFloat(weight) > 0) {
        await saveBodyweight({ weight: parseFloat(weight) });
      }
      // 2. baseline before photo — only if uploaded
      if (photoUrl) {
        await saveMemberPhoto({
          url: photoUrl,
          date: new Date().toISOString().split("T")[0],
          pose: "front",
          phase: "before",
          is_baseline: true,
        });
      }
      // 3. lift starting weights
      for (const [id, w] of Object.entries(liftWeights)) {
        const val = parseFloat(w);
        if (val > 0) savePersonalRecord(id, val);
      }
      // mark complete
      await setTrialBaselineCapturedAt();
      toast.success("Starting point saved — future you will thank you 🙌");
      setOpen(false);
      onDismiss();
    } catch (err: any) {
      toast.error("Couldn't save: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const meta = STEP_META[step];
  const isLast = step === "lifts";

  return (
    <>
      <div className="w-full flex items-center gap-3 rounded-xl border border-primary/40 border-l-4 border-l-primary bg-primary/10 p-3 text-left shadow-sm">
        <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Camera className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Set your starting point
          </p>
          <p className="font-heading text-lg tracking-wide uppercase leading-none">
            Day 0 baseline
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Two minutes now = a proper before-and-after in 30 days.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <Button size="sm" className="h-8" onClick={start}>
            Start
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-muted-foreground"
            onClick={onDismiss}
          >
            Maybe later
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary border border-primary/40 rounded-full px-2 py-0.5">
                Step {meta.n}/3
              </span>
              {meta.title}
            </DialogTitle>
            <DialogDescription>{meta.sub}</DialogDescription>
          </DialogHeader>

          {step === "weight" && (
            <div className="space-y-3 py-2">
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
                  Skip if you don't have scales handy — you can log it later.
                </p>
              </div>
            </div>
          )}

          {step === "photo" && (
            <div className="space-y-4 py-2">
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-6 cursor-pointer hover:bg-muted/60 transition">
                <Camera className="w-8 h-8 text-primary" />
                <span className="text-sm font-medium">
                  {photoUrl ? "Change photo" : "Tap to upload a photo"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Private — only you and your coach see this.
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhoto}
                />
              </label>
              {photoUrl && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Check className="w-4 h-4" /> Photo ready to save
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Tagged as your "before" so it pairs with a later shot.
              </p>
            </div>
          )}

          {step === "lifts" && (
            <div className="space-y-3 py-2 max-h-[50vh] overflow-y-auto">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5" /> Enter what you're lifting
                today (kg). Leave blank to skip.
              </p>
              {lifts.map((l) => (
                <div key={l.id} className="flex items-center gap-3">
                  <Label className="flex-1" htmlFor={`lift-${l.id}`}>
                    {l.label}
                  </Label>
                  <Input
                    id={`lift-${l.id}`}
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    className="w-28"
                    value={liftWeights[l.id] || ""}
                    onChange={(e) =>
                      setLiftWeights((s) => ({ ...s, [l.id]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={step === "weight" ? () => setOpen(false) : goBack}
              disabled={busy}
            >
              Back
            </Button>
            <div className="flex gap-2">
              {step !== "lifts" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goNext}
                  disabled={busy}
                >
                  Skip
                </Button>
              )}
              {isLast ? (
                <Button size="sm" onClick={finish} disabled={busy}>
                  {busy ? "Saving…" : "Save starting point"}
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

export default BaselineCard;
