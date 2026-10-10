import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Target,
  Ruler,
  Camera as CameraIcon,
  Utensils,
  Activity,
  Brain,
  ClipboardCheck,
  CircleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  saveMyOnboarding,
  saveOnboardingProgress,
  onboardingStatus,
  markOnboardingComplete,
  ONBOARDING_ITEM_LABELS,
  ONBOARDING_ITEM_SHORT_LABELS,
  type AccClient,
} from "@/lib/accountabilityProgramme";
import { OnboardingSection } from "./OnboardingSections";

interface SectionDef {
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

const SECTIONS: SectionDef[] = [
  {
    key: "why",
    title: "Your why & goals",
    icon: Heart,
    desc: "Let's understand what's driving you.",
  },
  {
    key: "nonscale",
    title: "Non-scale wins & events",
    icon: Target,
    desc: "Success beyond the number.",
  },
  {
    key: "baseline",
    title: "Baseline measurements",
    icon: Ruler,
    desc: "Where you're starting today.",
  },
  {
    key: "tracking",
    title: "Tracking, photos & energy",
    icon: CameraIcon,
    desc: "How we'll measure progress.",
  },
  {
    key: "eating",
    title: "Eating patterns",
    icon: Utensils,
    desc: "Your current relationship with food.",
  },
  {
    key: "activity",
    title: "Activity & sleep",
    icon: Activity,
    desc: "Movement and recovery.",
  },
  {
    key: "stress",
    title: "Stress, patterns & history",
    icon: Brain,
    desc: "What's helped and what hasn't.",
  },
  {
    key: "commit",
    title: "Commitment & approach",
    icon: ClipboardCheck,
    desc: "How you like to be coached.",
  },
];

/** Build a live client object from current form state for onboardingStatus. */
function buildLiveClient(
  client: AccClient,
  f: Record<string, any>,
  photoFront: string | null,
  photoSide: string | null,
): AccClient {
  const photos = [photoFront, photoSide].filter(Boolean) as string[];
  const baseline: Record<string, any> = {
    ...((client.baseline as Record<string, any>) || {}),
    weight: f.q10 ? Number(f.q10) : null,
    chest: f.q12 ? Number(f.q12) : null,
    waist: f.q13 ? Number(f.q13) : null,
    tummy: f.q16 ? Number(f.q16) : null,
    thigh: f.q15 ? Number(f.q15) : null,
    steps: f.q28 ? Number(f.q28) : null,
    avg_steps_baseline: f.q28 ? Number(f.q28) : null,
    photos,
  };
  const why = (f.q2 && f.q2.trim()) || (f.q1 && f.q1.trim()) || null;
  let nutritionApproach: string | null = null;
  if (f.q39)
    nutritionApproach = f.q39 === "Unsure" ? "plate" : f.q39.toLowerCase();
  return {
    ...client,
    why: why || client.why || null,
    baseline,
    nutrition_approach: nutritionApproach || client.nutrition_approach || null,
  };
}

export function AccountabilityOnboarding({
  client,
  onDone,
}: {
  client: AccClient;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState(0);
  const [busy, setBusy] = useState(false);
  const [photoFront, setPhotoFront] = useState<string | null>(null);
  const [photoSide, setPhotoSide] = useState<string | null>(null);
  const [f, setF] = useState<Record<string, any>>({});
  const [showMissing, setShowMissing] = useState(false);
  const savingRef = useRef(false);

  const set = (k: string, v: any) => setF((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (client.onboarding && Object.keys(client.onboarding).length) {
      setF({ ...client.onboarding });
      const b = client.baseline || {};
      if (b.photos) {
        setPhotoFront(b.photos[0] || null);
        setPhotoSide(b.photos[1] || null);
      }
    }
  }, [client]);

  const start = () => {
    setSection(0);
    setShowMissing(false);
    setOpen(true);
  };
  const goNext = () => setSection((s) => Math.min(s + 1, SECTIONS.length - 1));
  const goBack = () => setSection((s) => Math.max(s - 1, 0));

  const handlePhoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    which: "front" | "side",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");
      const ext = file.name.split(".").pop();
      const path = `nutrition-photos/${user.id}/acc-baseline-${which}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      if (which === "front") setPhotoFront(data.publicUrl);
      else setPhotoSide(data.publicUrl);
      toast.success("Photo added");
    } catch (err: any) {
      toast.error("Photo upload failed: " + err.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  // Auto-save progress (best-effort) when navigating between sections.
  const saveProgress = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const photos = [photoFront, photoSide].filter(Boolean) as string[];
      const baseline: Record<string, any> = {
        ...((client.baseline as Record<string, any>) || {}),
        weight: f.q10 ? Number(f.q10) : null,
        chest: f.q12 ? Number(f.q12) : null,
        waist: f.q13 ? Number(f.q13) : null,
        tummy: f.q16 ? Number(f.q16) : null,
        thigh: f.q15 ? Number(f.q15) : null,
        steps: f.q28 ? Number(f.q28) : null,
        avg_steps_baseline: f.q28 ? Number(f.q28) : null,
        photos,
      };
      await saveOnboardingProgress(client.id, f, baseline);
    } catch {
      /* ignore — progress save is best-effort */
    } finally {
      savingRef.current = false;
    }
  };

  const handleNav = (dir: "next" | "back" | "close") => {
    saveProgress();
    if (dir === "next") goNext();
    else if (dir === "back") goBack();
    else setOpen(false);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const photos = [photoFront, photoSide].filter(Boolean) as string[];
      const baseline: Record<string, any> = {
        weight: f.q10 ? Number(f.q10) : null,
        height: f.q11 || null,
        chest: f.q12 ? Number(f.q12) : null,
        waist: f.q13 ? Number(f.q13) : null,
        bodyFat: f.q14 ? Number(f.q14) : null,
        thigh: f.q15 ? Number(f.q15) : null,
        tummy: f.q16 ? Number(f.q16) : null,
        steps: f.q28 ? Number(f.q28) : null,
        avg_steps_baseline: f.q28 ? Number(f.q28) : null,
        photos,
      };
      const why = (f.q2 && f.q2.trim()) || (f.q1 && f.q1.trim()) || null;
      const derailers =
        (f.q35 && f.q35.trim()) || (f.q25 && f.q25.trim()) || null;
      const events = (f.q9 && f.q9.trim()) || null;
      const stepTarget = f.q28 ? Number(f.q28) : null;
      let nutritionApproach: string | null = null;
      if (f.q39)
        nutritionApproach = f.q39 === "Unsure" ? "plate" : f.q39.toLowerCase();
      const accountabilityStyle = f.q40 || null;
      const checkinPref = f.q41 || null;

      const { error } = await saveMyOnboarding(client.id, {
        onboarding: f,
        why,
        derailers,
        events,
        baseline,
        step_target: stepTarget,
        nutrition_approach: nutritionApproach,
        accountability_style: accountabilityStyle,
        checkin_pref: checkinPref,
        tracking_app: f.tracking_app || null,
        tracking_app_other: f.tracking_app_other || null,
        mfp_username: f.mfp_username || null,
      });
      if (error) throw error;

      if (f.q10 && Number(f.q10) > 0) {
        try {
          const { saveBodyweight } = await import("@/lib/store");
          await saveBodyweight(Number(f.q10));
        } catch (_) {}
      }

      // Check the 5 required items and stamp completion if all present.
      const live = buildLiveClient(client, f, photoFront, photoSide);
      const status = onboardingStatus(live);
      if (status.complete) {
        await markOnboardingComplete(client.id);
        toast.success("Onboarding complete — let's do this 🎯");
      } else {
        setShowMissing(true);
        toast.success("Progress saved — finish the 5 items before day 1");
      }
      setOpen(false);
      onDone?.();
    } catch (err: any) {
      toast.error("Couldn't save: " + (err?.message || "Unknown error"));
    } finally {
      setBusy(false);
    }
  };

  const isLast = section === SECTIONS.length - 1;
  const sec = SECTIONS[section];
  const SecIcon = sec.icon;

  // Live onboarding status from current form state.
  const liveClient = buildLiveClient(client, f, photoFront, photoSide);
  const status = onboardingStatus(liveClient);

  return (
    <>
      <Button onClick={start} className="gap-2">
        <ClipboardCheck className="h-4 w-4" />
        {client.onboarding_done ? "Review onboarding" : "Complete onboarding"}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) saveProgress();
          setOpen(o);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary border border-primary/40 rounded-full px-2 py-0.5">
                {section + 1}/{SECTIONS.length}
              </span>
              <SecIcon className="w-4 h-4 text-primary" />
              {sec.title}
            </DialogTitle>
            <DialogDescription>{sec.desc}</DialogDescription>
          </DialogHeader>

          {/* Needed to start checklist */}
          <div className="rounded-lg border border-border bg-muted/30 p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Needed to start
              </span>
              <span className="text-xs font-bold text-primary">
                {status.done}/5
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {(
                ["why", "photos", "measurements", "steps", "nutrition"] as const
              ).map((key) => {
                const done = !status.missing.includes(key);
                return (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        done
                          ? "bg-primary border-primary"
                          : "border-border bg-background"
                      }`}
                    >
                      {done && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </span>
                    <span
                      className={
                        done
                          ? "text-muted-foreground line-through"
                          : "text-foreground font-medium"
                      }
                    >
                      {ONBOARDING_ITEM_LABELS[key]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${((section + 1) / SECTIONS.length) * 100}%` }}
            />
          </div>

          <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-5 py-2">
            <OnboardingSection
              section={section}
              f={f}
              set={set}
              photoFront={photoFront}
              photoSide={photoSide}
              busy={busy}
              handlePhoto={handlePhoto}
            />
          </div>

          {/* Missing items warning on last section */}
          {isLast && showMissing && !status.complete && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-500 mb-1">
                <CircleAlert className="w-3.5 h-3.5" />
                Your coach needs these before day 1:
              </div>
              <div className="flex flex-wrap gap-1">
                {status.missing.map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-700 dark:text-amber-500"
                  >
                    {ONBOARDING_ITEM_SHORT_LABELS[m] || m}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={
                section === 0
                  ? () => handleNav("close")
                  : () => handleNav("back")
              }
              disabled={busy}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              {section === 0 ? "Cancel" : "Back"}
            </Button>
            <div className="flex items-center gap-2">
              {!isLast && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNav("next")}
                  disabled={busy}
                >
                  Skip
                </Button>
              )}
              {isLast ? (
                <Button
                  size="sm"
                  onClick={submit}
                  disabled={busy}
                  className="gap-1"
                >
                  {busy ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
                    </span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Submit
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleNav("next")}
                  disabled={busy}
                  className="gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AccountabilityOnboarding;
